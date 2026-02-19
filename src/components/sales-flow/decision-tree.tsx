"use client";

import * as React from "react";
import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { RoadmapV2, SalesStep } from "@/types/roadmap";
import { SALES_STEPS } from "@/types/roadmap";
import type { Product } from "@/types";
import type { Contact } from "@/lib/db/types";
import { updateContact } from "@/lib/actions/contacts";
import { StepAddContact } from "./step-add-contact";
import { StepOpeningPicker } from "./step-opening-picker";
import { StepDiscovery } from "./step-discovery";
import { StepPresentation } from "./step-presentation";
import { StepObjections } from "./step-objections";
import { StepClosing } from "./step-closing";
import { StepFollowUp } from "./step-followup";
import { StepSendSamples, type SampleAddress } from "./step-send-samples";

export interface DecisionTreeState {
  openingType: string | null;
  questionsAsked: string[];
  objectionsEncountered: string[];
  closingTechnique: string | null;
  sampleAgreed: boolean;
  sampleProductId: string | null;
  sampleAddress: SampleAddress | null;
}

interface DecisionTreeProps {
  roadmap: RoadmapV2;
  product: Product;
  initialContact?: Contact;
}

function contactToState(contact: Contact): DecisionTreeState {
  return {
    openingType: contact.opening_type || null,
    questionsAsked: contact.questions_asked || [],
    objectionsEncountered: contact.objections_encountered || [],
    closingTechnique: contact.closing_technique || null,
    sampleAgreed: contact.sample_sent,
    sampleProductId: contact.sample_product || null,
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

export function DecisionTree({ roadmap, product, initialContact }: DecisionTreeProps) {
  const [activeContact, setActiveContact] = useState<Contact | null>(initialContact || null);
  const [currentStepIndex, setCurrentStepIndex] = useState(() =>
    initialContact ? Math.max(stepIdToIndex(initialContact.current_step), 1) : 0
  );
  const [state, setState] = useState<DecisionTreeState>(() =>
    initialContact ? contactToState(initialContact) : {
      openingType: null,
      questionsAsked: [],
      objectionsEncountered: [],
      closingTechnique: null,
      sampleAgreed: false,
      sampleProductId: null,
      sampleAddress: null,
    }
  );

  const isGated = !activeContact;
  const currentStep = SALES_STEPS[currentStepIndex];
  const progress = ((currentStepIndex + 1) / SALES_STEPS.length) * 100;
  const saveInFlight = useRef(false);

  // Auto-save to contact on step change or state change
  useEffect(() => {
    if (!activeContact || currentStepIndex === 0 || saveInFlight.current) return;

    const timer = setTimeout(async () => {
      saveInFlight.current = true;
      try {
        await updateContact(activeContact.id, {
          current_step: currentStep.id,
          opening_type: state.openingType || null,
          questions_asked: state.questionsAsked,
          objections_encountered: state.objectionsEncountered,
          closing_technique: state.closingTechnique || null,
          sample_sent: state.sampleAgreed,
          sample_product: state.sampleProductId || null,
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

  const setOpeningType = useCallback((type: string) => {
    setState(prev => ({ ...prev, openingType: type }));
  }, []);

  const toggleQuestion = useCallback((question: string) => {
    setState(prev => ({
      ...prev,
      questionsAsked: prev.questionsAsked.includes(question)
        ? prev.questionsAsked.filter(q => q !== question)
        : [...prev.questionsAsked, question],
    }));
  }, []);

  const toggleObjection = useCallback((objection: string) => {
    setState(prev => ({
      ...prev,
      objectionsEncountered: prev.objectionsEncountered.includes(objection)
        ? prev.objectionsEncountered.filter(o => o !== objection)
        : [...prev.objectionsEncountered, objection],
    }));
  }, []);

  const setClosingTechnique = useCallback((technique: string) => {
    setState(prev => ({ ...prev, closingTechnique: technique }));
  }, []);

  const setSampleAgreed = useCallback((agreed: boolean) => {
    setState(prev => ({ ...prev, sampleAgreed: agreed }));
  }, []);

  const setSampleProductId = useCallback((productId: string) => {
    setState(prev => ({ ...prev, sampleProductId: productId }));
  }, []);

  const setSampleAddress = useCallback((address: SampleAddress) => {
    setState(prev => ({ ...prev, sampleAddress: address }));
  }, []);

  const renderStep = () => {
    switch (currentStep.id) {
      case "add_contact":
        return (
          <StepAddContact
            customerProfileData={roadmap.sections["1_customer_profile"]}
            product={product}
            onContactCreated={handleContactCreated}
            existingContact={activeContact}
          />
        );
      case "opening":
        return (
          <StepOpeningPicker
            data={roadmap.sections["2_opening_approaches"]}
            selectedType={state.openingType}
            onSelect={(type) => { setOpeningType(type); }}
            onContinue={goNext}
          />
        );
      case "discovery":
        return (
          <StepDiscovery
            data={roadmap.sections["3_discovery_questions"]}
            questionsAsked={state.questionsAsked}
            onToggleQuestion={toggleQuestion}
            onContinue={goNext}
          />
        );
      case "presentation":
        return (
          <StepPresentation
            data={roadmap.sections["4_presentation"]}
            product={product}
            onContinue={goNext}
          />
        );
      case "samples":
        return (
          <StepSendSamples
            product={product}
            sampleAgreed={state.sampleAgreed}
            sampleProductId={state.sampleProductId}
            sampleAddress={state.sampleAddress}
            onSetSampleAgreed={setSampleAgreed}
            onSetSampleProductId={setSampleProductId}
            onSetSampleAddress={setSampleAddress}
            onContinue={goNext}
          />
        );
      case "objections":
        return (
          <StepObjections
            data={roadmap.sections["5_objection_handling"]}
            encountered={state.objectionsEncountered}
            onToggle={toggleObjection}
            onContinue={goNext}
          />
        );
      case "closing":
        return (
          <StepClosing
            data={roadmap.sections["6_closing"]}
            selectedTechnique={state.closingTechnique}
            onSelect={setClosingTechnique}
            onContinue={goNext}
          />
        );
      case "followup":
        return (
          <StepFollowUp
            data={roadmap.sections["7_followup"]}
            contactId={activeContact?.id}
          />
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
          <span className="font-medium text-foreground">{activeContact.name}</span>
          <span>-</span>
          <span>{product.name}</span>
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
