"use client";

import * as React from "react";
import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import type { RoadmapV2, SalesStep } from "@/types/roadmap";
import { SALES_STEPS } from "@/types/roadmap";
import type { Product } from "@/types";
import type { Contact } from "@/lib/db/types";
import { products as allProducts } from "@/data/products";
import { updateContact } from "@/lib/actions/contacts";
import { getRoadmapsForProducts } from "@/lib/roadmap-data";
import { StepAddContact } from "./step-add-contact";
import { StepOpeningPicker } from "./step-opening-picker";
import { StepDiscovery } from "./step-discovery";
import { StepPresentation } from "./step-presentation";
import { StepObjections } from "./step-objections";
import { StepClosing } from "./step-closing";
import { StepFollowUp } from "./step-followup";
import { StepSendSamples, type SampleAddress } from "./step-send-samples";
import { ProductTabs } from "./product-tabs";
import { CustomerInsight } from "./customer-insight";

export interface DecisionTreeState {
  openingTypes: Record<string, string>;
  questionsAsked: Record<string, string[]>;
  objectionsEncountered: Record<string, string[]>;
  closingTechniques: Record<string, string>;
  sampleAgreed: boolean;
  sampleProducts: string[];
  sampleAddress: SampleAddress | null;
}

interface DecisionTreeProps {
  initialContact?: Contact;
}

function asRecord<T>(val: unknown, fallback: T): T {
  if (val && typeof val === "object" && !Array.isArray(val)) return val as T;
  return fallback;
}

function contactToState(contact: Contact): DecisionTreeState {
  return {
    openingTypes: asRecord(contact.opening_types, {}),
    questionsAsked: asRecord(contact.questions_asked, {}),
    objectionsEncountered: asRecord(contact.objections_encountered, {}),
    closingTechniques: asRecord(contact.closing_techniques, {}),
    sampleAgreed: contact.sample_sent,
    sampleProducts: contact.sample_products || [],
    sampleAddress: contact.address_line1
      ? {
          line1: contact.address_line1 || "",
          line2: contact.address_line2 || "",
          city: contact.address_city || "",
          state: contact.address_state || "",
          zip: contact.address_zip || "",
        }
      : null,
  };
}

function stepIdToIndex(stepId: string): number {
  const idx = SALES_STEPS.findIndex((s) => s.id === stepId);
  return idx >= 0 ? idx : 0;
}

export function DecisionTree({ initialContact }: DecisionTreeProps) {
  const [activeContact, setActiveContact] = useState<Contact | null>(initialContact || null);
  const [currentStepIndex, setCurrentStepIndex] = useState(() =>
    initialContact ? Math.max(stepIdToIndex(initialContact.current_step), 1) : 0
  );
  const [state, setState] = useState<DecisionTreeState>(() =>
    initialContact ? contactToState(initialContact) : {
      openingTypes: {},
      questionsAsked: {},
      objectionsEncountered: {},
      closingTechniques: {},
      sampleAgreed: false,
      sampleProducts: [],
      sampleAddress: null,
    }
  );

  const contactProductIds = activeContact?.product_ids || [];
  const contactProducts = allProducts.filter(p => contactProductIds.includes(p.id));
  const roadmaps = getRoadmapsForProducts(contactProductIds);

  const isGated = !activeContact;
  const currentStep = SALES_STEPS[currentStepIndex];
  const progress = ((currentStepIndex + 1) / SALES_STEPS.length) * 100;
  const saveInFlight = useRef(false);

  useEffect(() => {
    if (!activeContact || currentStepIndex === 0 || saveInFlight.current) return;

    const timer = setTimeout(async () => {
      saveInFlight.current = true;
      try {
        await updateContact(activeContact.id, {
          current_step: currentStep.id,
          opening_types: state.openingTypes,
          questions_asked: state.questionsAsked,
          objections_encountered: state.objectionsEncountered,
          closing_techniques: state.closingTechniques,
          sample_sent: state.sampleAgreed,
          sample_products: state.sampleProducts,
          address_line1: state.sampleAddress?.line1 || null,
          address_line2: state.sampleAddress?.line2 || null,
          address_city: state.sampleAddress?.city || null,
          address_state: state.sampleAddress?.state || null,
          address_zip: state.sampleAddress?.zip || null,
        });
      } finally {
        saveInFlight.current = false;
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [currentStepIndex, state, activeContact, currentStep.id]);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < SALES_STEPS.length) {
      if (isGated && index > 0) return;
      setCurrentStepIndex(index);
    }
  }, [isGated]);

  const goNext = useCallback(() => goToStep(currentStepIndex + 1), [currentStepIndex, goToStep]);
  const goPrev = useCallback(() => goToStep(currentStepIndex - 1), [currentStepIndex, goToStep]);

  const handleContactCreated = useCallback((contact: Contact) => {
    setActiveContact(contact);
    setCurrentStepIndex(1);
  }, []);

  const setOpeningType = useCallback((productId: string, type: string) => {
    setState(prev => ({
      ...prev,
      openingTypes: { ...prev.openingTypes, [productId]: type },
    }));
  }, []);

  const toggleQuestion = useCallback((productId: string, question: string) => {
    setState(prev => {
      const current = prev.questionsAsked[productId] || [];
      return {
        ...prev,
        questionsAsked: {
          ...prev.questionsAsked,
          [productId]: current.includes(question)
            ? current.filter(q => q !== question)
            : [...current, question],
        },
      };
    });
  }, []);

  const toggleObjection = useCallback((productId: string, objection: string) => {
    setState(prev => {
      const current = prev.objectionsEncountered[productId] || [];
      return {
        ...prev,
        objectionsEncountered: {
          ...prev.objectionsEncountered,
          [productId]: current.includes(objection)
            ? current.filter(o => o !== objection)
            : [...current, objection],
        },
      };
    });
  }, []);

  const setClosingTechnique = useCallback((productId: string, technique: string) => {
    setState(prev => ({
      ...prev,
      closingTechniques: { ...prev.closingTechniques, [productId]: technique },
    }));
  }, []);

  const setSampleAgreed = useCallback((agreed: boolean) => {
    setState(prev => ({ ...prev, sampleAgreed: agreed }));
  }, []);

  const toggleSampleProduct = useCallback((productId: string) => {
    setState(prev => ({
      ...prev,
      sampleProducts: prev.sampleProducts.includes(productId)
        ? prev.sampleProducts.filter(p => p !== productId)
        : [...prev.sampleProducts, productId],
    }));
  }, []);

  const setSampleAddress = useCallback((address: SampleAddress) => {
    setState(prev => ({ ...prev, sampleAddress: address }));
  }, []);

  const renderStep = () => {
    switch (currentStep.id) {
      case "add_contact":
        return (
          <StepAddContact
            onContactCreated={handleContactCreated}
            existingContact={activeContact}
          />
        );
      case "opening":
        return (
          <ProductTabs products={contactProducts}>
            {(product) => {
              const roadmap = roadmaps[product.id];
              if (!roadmap) return null;
              return (
                <div className="space-y-4">
                  <CustomerInsight
                    data={roadmap.sections["1_customer_profile"]}
                    productName={product.name}
                  />
                  <StepOpeningPicker
                    data={roadmap.sections["2_opening_approaches"]}
                    selectedType={state.openingTypes[product.id] || null}
                    onSelect={(type) => { setOpeningType(product.id, type); }}
                    onContinue={goNext}
                  />
                </div>
              );
            }}
          </ProductTabs>
        );
      case "discovery":
        return (
          <ProductTabs products={contactProducts}>
            {(product) => {
              const roadmap = roadmaps[product.id];
              if (!roadmap) return null;
              return (
                <div className="space-y-4">
                  <CustomerInsight
                    data={roadmap.sections["1_customer_profile"]}
                    productName={product.name}
                  />
                  <StepDiscovery
                    data={roadmap.sections["3_discovery_questions"]}
                    questionsAsked={state.questionsAsked[product.id] || []}
                    onToggleQuestion={(q) => toggleQuestion(product.id, q)}
                    onContinue={goNext}
                  />
                </div>
              );
            }}
          </ProductTabs>
        );
      case "presentation":
        return (
          <ProductTabs products={contactProducts}>
            {(product) => {
              const roadmap = roadmaps[product.id];
              if (!roadmap) return null;
              return (
                <StepPresentation
                  data={roadmap.sections["4_presentation"]}
                  product={product}
                  metadata={roadmap.metadata}
                  questionsAsked={state.questionsAsked[product.id] || []}
                  onContinue={goNext}
                />
              );
            }}
          </ProductTabs>
        );
      case "samples":
        return (
          <StepSendSamples
            products={contactProducts}
            sampleAgreed={state.sampleAgreed}
            sampleProducts={state.sampleProducts}
            sampleAddress={state.sampleAddress}
            onSetSampleAgreed={setSampleAgreed}
            onToggleSampleProduct={toggleSampleProduct}
            onSetSampleAddress={setSampleAddress}
            onContinue={goNext}
          />
        );
      case "objections":
        return (
          <ProductTabs products={contactProducts}>
            {(product) => {
              const roadmap = roadmaps[product.id];
              if (!roadmap) return null;
              return (
                <StepObjections
                  data={roadmap.sections["5_objection_handling"]}
                  encountered={state.objectionsEncountered[product.id] || []}
                  onToggle={(obj) => toggleObjection(product.id, obj)}
                  onContinue={goNext}
                />
              );
            }}
          </ProductTabs>
        );
      case "closing":
        return (
          <ProductTabs products={contactProducts}>
            {(product) => {
              const roadmap = roadmaps[product.id];
              if (!roadmap) return null;
              return (
                <StepClosing
                  data={roadmap.sections["6_closing"]}
                  selectedTechnique={state.closingTechniques[product.id] || null}
                  onSelect={(t) => setClosingTechnique(product.id, t)}
                  onContinue={goNext}
                />
              );
            }}
          </ProductTabs>
        );
      case "followup":
        return (
          <ProductTabs products={contactProducts}>
            {(product) => {
              const roadmap = roadmaps[product.id];
              if (!roadmap) return null;
              return (
                <StepFollowUp
                  data={roadmap.sections["7_followup"]}
                  contactId={activeContact?.id}
                />
              );
            }}
          </ProductTabs>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Active contact indicator */}
      {activeContact && currentStepIndex > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <span className="font-medium text-foreground">{activeContact.first_name} {activeContact.last_name}</span>
          <span>-</span>
          <div className="flex items-center gap-1">
            {contactProducts.map(p => (
              <div key={p.id} className="relative size-4 rounded-full overflow-hidden" title={p.name}>
                <Image src={p.image} alt={p.name} fill className="object-cover" sizes="16px" />
              </div>
            ))}
          </div>
          {activeContact.email && <span>({activeContact.email})</span>}
        </div>
      )}

      {/* Progress bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Step {currentStepIndex + 1} of {SALES_STEPS.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step indicators */}
        <div className="flex gap-1">
          {SALES_STEPS.map((step, index) => {
            const disabled = isGated && index > 0;
            return (
              <button
                key={step.id}
                onClick={() => !disabled && goToStep(index)}
                className={`flex-1 group ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                disabled={disabled}
              >
                <div
                  className={`h-1.5 rounded-full transition-colors ${
                    index <= currentStepIndex ? "bg-primary" : "bg-muted"
                  }`}
                />
                <span
                  className={`text-[10px] mt-1 block truncate transition-colors ${
                    index === currentStepIndex
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Current step header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs tabular-nums">
            {currentStep.number}/{SALES_STEPS.length}
          </Badge>
          <h2 className="text-lg font-semibold">{currentStep.label}</h2>
        </div>
      </div>

      {/* Step content */}
      <div className="min-h-[400px]">{renderStep()}</div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={goPrev}
          disabled={currentStepIndex === 0}
        >
          <ChevronLeft className="size-4 mr-1" />
          Previous
        </Button>
        <Button
          size="sm"
          onClick={goNext}
          disabled={currentStepIndex === SALES_STEPS.length - 1 || (isGated && currentStepIndex === 0)}
        >
          Next
          <ChevronRight className="size-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
