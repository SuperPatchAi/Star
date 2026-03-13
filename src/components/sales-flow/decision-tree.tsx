"use client";

import * as React from "react";
import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ChevronLeft, ChevronRight, UserPlus, MessageSquare, HelpCircle, Presentation, Package, ShieldAlert, Handshake, CalendarCheck, ArrowLeft } from "lucide-react";
import Image from "next/image";
import type { RoadmapV2, SalesStep } from "@/types/roadmap";
import { SALES_STEPS } from "@/types/roadmap";
import type { Product } from "@/types";
import type { Contact } from "@/lib/db/types";
import { products as allProducts } from "@/data/products";
import { updateContact, advanceFollowUpDay } from "@/lib/actions/contacts";
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
  variant?: "page" | "drawer";
  onContactCreated?: (contact: Contact) => void;
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

const STEP_ICONS: Record<string, React.ElementType> = {
  add_contact: UserPlus,
  opening: MessageSquare,
  discovery: HelpCircle,
  presentation: Presentation,
  samples: Package,
  objections: ShieldAlert,
  closing: Handshake,
  followup: CalendarCheck,
};

export function DecisionTree({ initialContact, variant = "page", onContactCreated: onContactCreatedProp }: DecisionTreeProps) {
  const isDrawer = variant === "drawer";
  const [activeContact, setActiveContact] = useState<Contact | null>(initialContact || null);
  const [followUpDay, setFollowUpDay] = useState(() => initialContact?.follow_up_day ?? 0);
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
  const contactFirstName = activeContact?.first_name || "";

  const isGated = !activeContact;
  const currentStep = SALES_STEPS[currentStepIndex];
  const progress = ((currentStepIndex + 1) / SALES_STEPS.length) * 100;
  const saveInFlight = useRef(false);
  const stepsScrollRef = useRef<HTMLDivElement>(null);
  const pendingSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const container = stepsScrollRef.current;
    if (!container) return;
    const activeEl = container.children[currentStepIndex] as HTMLElement | undefined;
    if (activeEl) {
      activeEl.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    }
  }, [currentStepIndex]);

  const buildSavePayload = useCallback(() => ({
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
  }), [currentStep.id, state]);

  useEffect(() => {
    if (!activeContact || currentStepIndex === 0 || saveInFlight.current) return;

    const timer = setTimeout(async () => {
      saveInFlight.current = true;
      pendingSaveRef.current = null;
      try {
        await updateContact(activeContact.id, buildSavePayload());
      } finally {
        saveInFlight.current = false;
      }
    }, 500);

    pendingSaveRef.current = timer;
    return () => { clearTimeout(timer); pendingSaveRef.current = null; };
  }, [currentStepIndex, state, activeContact, currentStep.id, buildSavePayload]);

  useEffect(() => {
    if (!isDrawer) return;
    const contactRef = activeContact;
    return () => {
      if (pendingSaveRef.current && contactRef) {
        clearTimeout(pendingSaveRef.current);
        pendingSaveRef.current = null;
        updateContact(contactRef.id, {
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
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDrawer]);

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
    setFollowUpDay(contact.follow_up_day ?? 0);
    setCurrentStepIndex(1);
    onContactCreatedProp?.(contact);
  }, [onContactCreatedProp]);

  const handleAdvanceFollowUp = useCallback(async () => {
    if (!activeContact) return;
    await advanceFollowUpDay(activeContact.id);
    setFollowUpDay(prev => prev + 1);
  }, [activeContact]);

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
                    contactFirstName={contactFirstName}
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
                  contactFirstName={contactFirstName}
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
            contactFirstName={contactFirstName}
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
                  contactFirstName={contactFirstName}
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
                  contactFirstName={contactFirstName}
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
                  followUpDay={followUpDay}
                  onAdvance={handleAdvanceFollowUp}
                  contactFirstName={contactFirstName}
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
      {/* Active contact header (page variant only) */}
      {!isDrawer && activeContact && currentStepIndex > 0 && (
        <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5 min-w-0">
          <Link href="/contacts" className="shrink-0 p-1 -ml-1 rounded hover:bg-muted transition-colors" aria-label="Back to contacts">
            <ArrowLeft className="size-4 text-muted-foreground" />
          </Link>
          {contactProducts.length > 0 && (
            <div className="flex -space-x-1 shrink-0">
              {contactProducts.slice(0, 3).map(p => (
                <div key={p.id} className="relative size-6 rounded-full overflow-hidden border-2 border-background" title={p.name}>
                  <Image src={p.image} alt={p.name} fill className="object-cover" sizes="24px" />
                </div>
              ))}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{activeContact.first_name} {activeContact.last_name}</p>
            <p className="text-xs text-muted-foreground truncate">{contactProducts.map(p => p.name).join(", ")}</p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">Step {currentStepIndex + 1} of {SALES_STEPS.length}</span>
          <span className="font-semibold text-foreground">{Math.round(progress)}% Complete</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step indicators -- desktop: bar, mobile: scrollable pills */}
        <div className="hidden md:flex gap-1">
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
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>

        <div
          ref={stepsScrollRef}
          className="flex md:hidden gap-2 overflow-x-auto scrollbar-none snap-x snap-mandatory -mx-4 px-4 pb-1"
        >
          {SALES_STEPS.map((step, index) => {
            const disabled = isGated && index > 0;
            const isCurrent = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;
            const Icon = STEP_ICONS[step.id] || HelpCircle;
            return (
              <button
                key={step.id}
                onClick={() => !disabled && goToStep(index)}
                disabled={disabled}
                className={cn(
                  "flex items-center gap-1.5 shrink-0 snap-center rounded-full px-3 min-h-[44px] text-xs font-medium border transition-all",
                  isCurrent && "bg-primary text-primary-foreground border-primary",
                  isCompleted && !isCurrent && "bg-primary/10 text-primary border-primary/30",
                  !isCurrent && !isCompleted && "bg-muted text-muted-foreground border-transparent",
                  disabled && "opacity-40 cursor-not-allowed"
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className={cn("whitespace-nowrap", isCurrent ? "" : "sr-only sm:not-sr-only")}>
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
          <span className="text-xs tabular-nums text-muted-foreground font-medium">{currentStep.number}/{SALES_STEPS.length}</span>
          <h2 className="text-lg font-semibold">{currentStep.label}</h2>
        </div>
      </div>

      {/* Step content */}
      <div className={isDrawer ? "" : "min-h-[300px] sm:min-h-[400px] pb-24 md:pb-0"}>{renderStep()}</div>

      {/* Navigation -- inline for drawer and desktop, fixed footer for page mobile */}
      <div className={cn(
        "flex items-center justify-between border-t pt-4",
        isDrawer ? "" : "hidden md:flex"
      )}>
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

      {!isDrawer && (
        <div className="fixed bottom-16 left-0 right-0 z-40 flex items-center gap-2 border-t bg-background/95 backdrop-blur-sm px-4 py-2 md:hidden pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
          <Button
            variant="outline"
            className="flex-1 h-12 text-sm"
            onClick={goPrev}
            disabled={currentStepIndex === 0}
          >
            <ChevronLeft className="size-4 mr-1" />
            Previous
          </Button>
          <span className="text-xs text-muted-foreground text-center min-w-0 truncate px-1">
            {currentStep.label}
          </span>
          <Button
            className="flex-1 h-12 text-sm"
            onClick={goNext}
            disabled={currentStepIndex === SALES_STEPS.length - 1 || (isGated && currentStepIndex === 0)}
          >
            Next
            <ChevronRight className="size-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
