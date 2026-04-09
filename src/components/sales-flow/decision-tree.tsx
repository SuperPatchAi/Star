"use client";

import * as React from "react";
import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ChevronLeft, ChevronRight, UserPlus, HeartHandshake, HelpCircle, Package, Handshake, ShoppingCart, CalendarCheck, ArrowLeft } from "lucide-react";
import Image from "next/image";
import type { RoadmapV2, SalesStep } from "@/types/roadmap";
import { SALES_STEPS } from "@/types/roadmap";
import type { Product } from "@/types";
import type { Contact, TimestampedObjection, QuestionsAsked, ObjectionsEncountered } from "@/lib/db/types";
import { normalizeQuestions, normalizeObjections, normalizeContactStep } from "@/lib/db/types";
import { products as allProducts } from "@/data/products";
import { updateContact, advanceFollowUpDay, markSamplesReceived } from "@/lib/actions/contacts";
import { getStoreSubdomain } from "@/lib/actions/profile";
import { getRoadmapsForProducts } from "@/lib/roadmap-data";
import { StepAddContact } from "./step-add-contact";
import { StepRapport } from "./step-rapport";
import { StepDiscoveryV2 } from "./step-discovery-v2";
import { StepClose } from "./step-close";
import { StepFollowUp } from "./step-followup";
import { StepPurchaseLinks } from "./step-purchase-links";
import { StepSendSamples, type SampleAddress } from "./step-send-samples";
import { ProductTabs } from "./product-tabs";
import { getCategoriesByKeys, joinCategoryLabels } from "@/data/discovery-categories";

export interface DecisionTreeState {
  discoveryCategories: string[];
  discoveryQualityRating: number | null;
  discoveryDuration: string | null;
  discoveryTriedBefore: string[];
  discoveryTriedResult: string | null;
  sampleAgreed: boolean;
  sampleProducts: string[];
  sampleQuantities: Record<string, number>;
  sampleAddress: SampleAddress | null;
  sampleReceived: boolean;
  followupRatings: Record<string, number>;
  questionsAsked: QuestionsAsked;
  objectionsEncountered: ObjectionsEncountered;
  closingTechniques: Record<string, string>;
}

interface DecisionTreeProps {
  initialContact?: Contact;
  variant?: "page" | "drawer";
  onContactCreated?: (contact: Contact) => void;
  onContactUpdated?: (updates: Record<string, unknown>) => void;
}

function asRecord<T>(val: unknown, fallback: T): T {
  if (val && typeof val === "object" && !Array.isArray(val)) return val as T;
  return fallback;
}

function normalizeQuestionsRecord(raw: unknown): QuestionsAsked {
  const record = asRecord(raw, {} as Record<string, unknown>);
  const result: QuestionsAsked = {};
  for (const [key, value] of Object.entries(record)) {
    result[key] = normalizeQuestions(value);
  }
  return result;
}

function normalizeObjectionsRecord(raw: unknown): ObjectionsEncountered {
  const record = asRecord(raw, {} as Record<string, unknown>);
  const result: ObjectionsEncountered = {};
  for (const [key, value] of Object.entries(record)) {
    result[key] = normalizeObjections(value);
  }
  return result;
}

function getLatestRating(ratings: Record<string, number>): number | undefined {
  const keys = Object.keys(ratings).map(Number).sort((a, b) => b - a);
  return keys.length > 0 ? ratings[String(keys[0])] : undefined;
}

function contactToState(contact: Contact): DecisionTreeState {
  return {
    discoveryCategories: contact.discovery_category ?? [],
    discoveryQualityRating: contact.discovery_quality_rating || null,
    discoveryDuration: contact.discovery_duration || null,
    discoveryTriedBefore: contact.discovery_tried_before || [],
    discoveryTriedResult: contact.discovery_tried_result || null,
    sampleAgreed: contact.sample_sent,
    sampleProducts: contact.sample_products || [],
    sampleQuantities: asRecord(contact.sample_quantities, {} as Record<string, number>),
    sampleReceived: contact.sample_followup_done,
    sampleAddress: contact.address_line1
      ? { line1: contact.address_line1 || "", line2: contact.address_line2 || "", city: contact.address_city || "", state: contact.address_state || "", zip: contact.address_zip || "" }
      : null,
    followupRatings: asRecord(contact.followup_ratings, {} as Record<string, number>),
    questionsAsked: normalizeQuestionsRecord(contact.questions_asked),
    objectionsEncountered: normalizeObjectionsRecord(contact.objections_encountered),
    closingTechniques: asRecord(contact.closing_techniques, {}),
  };
}

function stepIdToIndex(stepId: string): number {
  const normalized = normalizeContactStep(stepId);
  const idx = SALES_STEPS.findIndex((s) => s.id === normalized);
  return idx >= 0 ? idx : 0;
}

const STEP_ICONS: Record<string, React.ElementType> = {
  add_contact: UserPlus,
  rapport: HeartHandshake,
  discovery: HelpCircle,
  samples: Package,
  followup: CalendarCheck,
  close: Handshake,
  purchase_links: ShoppingCart,
};

export function DecisionTree({ initialContact, variant = "page", onContactCreated: onContactCreatedProp, onContactUpdated }: DecisionTreeProps) {
  const isDrawer = variant === "drawer";
  const [activeContact, setActiveContact] = useState<Contact | null>(initialContact || null);
  const [followUpDay, setFollowUpDay] = useState(() => initialContact?.follow_up_day ?? 0);
  const [currentStepIndex, setCurrentStepIndex] = useState(() =>
    initialContact ? Math.max(stepIdToIndex(initialContact.current_step), 1) : 0
  );
  const [state, setState] = useState<DecisionTreeState>(() =>
    initialContact ? contactToState(initialContact) : {
      discoveryCategories: [],
      discoveryQualityRating: null,
      discoveryDuration: null,
      discoveryTriedBefore: [],
      discoveryTriedResult: null,
      sampleAgreed: false,
      sampleProducts: [],
      sampleQuantities: {},
      sampleAddress: null,
      sampleReceived: false,
      followupRatings: {},
      questionsAsked: {},
      objectionsEncountered: {},
      closingTechniques: {},
    }
  );

  const [storeSubdomain, setStoreSubdomain] = useState<string | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    getStoreSubdomain().then(setStoreSubdomain);
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      setKeyboardOpen(vv.height < window.innerHeight * 0.75);
    };
    vv.addEventListener("resize", handler);
    return () => vv.removeEventListener("resize", handler);
  }, []);

  const contactProductIds = activeContact?.product_ids || [];
  const contactProducts = allProducts.filter(p => contactProductIds.includes(p.id));
  const roadmaps = getRoadmapsForProducts(contactProductIds);
  const contactFirstName = activeContact?.first_name || "";

  const isGated = !activeContact;
  const currentStep = SALES_STEPS[currentStepIndex];
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
    product_ids: activeContact?.product_ids || [],
    discovery_category: state.discoveryCategories,
    discovery_quality_rating: state.discoveryQualityRating,
    discovery_duration: state.discoveryDuration,
    discovery_tried_before: state.discoveryTriedBefore,
    discovery_tried_result: state.discoveryTriedResult,
    questions_asked: state.questionsAsked,
    objections_encountered: state.objectionsEncountered,
    closing_techniques: state.closingTechniques,
    sample_sent: state.sampleAgreed,
    sample_products: state.sampleProducts,
    sample_quantities: state.sampleQuantities,
    sample_followup_done: state.sampleReceived,
    followup_ratings: state.followupRatings,
    address_line1: state.sampleAddress?.line1 || null,
    address_line2: state.sampleAddress?.line2 || null,
    address_city: state.sampleAddress?.city || null,
    address_state: state.sampleAddress?.state || null,
    address_zip: state.sampleAddress?.zip || null,
  }), [currentStep.id, state, activeContact?.product_ids]);

  useEffect(() => {
    if (!activeContact || currentStepIndex === 0 || saveInFlight.current) return;

    const timer = setTimeout(async () => {
      saveInFlight.current = true;
      pendingSaveRef.current = null;
      try {
        const payload = buildSavePayload();
        await updateContact(activeContact.id, payload);
        onContactUpdated?.(payload as Record<string, unknown>);
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
          product_ids: contactRef.product_ids || [],
          discovery_category: state.discoveryCategories,
          discovery_quality_rating: state.discoveryQualityRating,
          discovery_duration: state.discoveryDuration,
          discovery_tried_before: state.discoveryTriedBefore,
          discovery_tried_result: state.discoveryTriedResult,
          questions_asked: state.questionsAsked,
          objections_encountered: state.objectionsEncountered,
          closing_techniques: state.closingTechniques,
          sample_sent: state.sampleAgreed,
          sample_products: state.sampleProducts,
          sample_quantities: state.sampleQuantities,
          sample_followup_done: state.sampleReceived,
          followup_ratings: state.followupRatings,
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

  const toggleDiscoveryCategory = useCallback((key: string) => {
    setState(prev => ({
      ...prev,
      discoveryCategories: prev.discoveryCategories.includes(key) ? [] : [key],
      discoveryQualityRating: prev.discoveryQualityRating ?? 5,
    }));
  }, []);

  useEffect(() => {
    const mapped = getCategoriesByKeys(state.discoveryCategories).map(c => c.productId);
    if (mapped.length > 0 && activeContact) {
      setActiveContact(prev => {
        if (!prev) return prev;
        const merged = [...new Set([...mapped, ...prev.product_ids])];
        if (merged.length === prev.product_ids.length && merged.every(id => prev.product_ids.includes(id))) return prev;
        return { ...prev, product_ids: merged };
      });
    }
  }, [state.discoveryCategories, activeContact]);

  const setDiscoveryQualityRating = useCallback((rating: number) => {
    setState(prev => ({ ...prev, discoveryQualityRating: rating }));
  }, []);

  const setDiscoveryDuration = useCallback((duration: string) => {
    setState(prev => ({ ...prev, discoveryDuration: duration }));
  }, []);

  const setDiscoveryTriedBefore = useCallback((items: string[]) => {
    setState(prev => ({ ...prev, discoveryTriedBefore: items }));
  }, []);

  const setDiscoveryTriedResult = useCallback((result: string) => {
    setState(prev => ({ ...prev, discoveryTriedResult: result }));
  }, []);

  const setFollowupRating = useCallback((dayIndex: number, rating: number) => {
    setState(prev => ({
      ...prev,
      followupRatings: { ...prev.followupRatings, [String(dayIndex)]: rating },
    }));
  }, []);

  const toggleObjection = useCallback((productId: string, objection: string) => {
    setState(prev => {
      const current = prev.objectionsEncountered[productId] || [];
      const exists = current.some(o => o.objection === objection);
      return {
        ...prev,
        objectionsEncountered: {
          ...prev.objectionsEncountered,
          [productId]: exists
            ? current.filter(o => o.objection !== objection)
            : [...current, { objection, encountered_at: new Date().toISOString() } as TimestampedObjection],
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

  const setSampleQuantity = useCallback((productId: string, qty: number) => {
    setState(prev => ({
      ...prev,
      sampleQuantities: { ...prev.sampleQuantities, [productId]: qty },
    }));
  }, []);

  const handleSampleReceived = useCallback(async (received: boolean) => {
    setState(prev => ({ ...prev, sampleReceived: received }));
    if (received && activeContact) {
      await markSamplesReceived(activeContact.id);
    }
  }, [activeContact]);

  const nextStepLabel = SALES_STEPS[currentStepIndex + 1]?.label;
  const continueLabel = nextStepLabel ? `Continue to ${nextStepLabel}` : "Complete";

  const renderStep = () => {
    switch (currentStep.id) {
      case "add_contact":
        return (
          <StepAddContact
            onContactCreated={handleContactCreated}
            existingContact={activeContact}
          />
        );
      case "rapport":
        return (
          <StepRapport
            products={allProducts}
            contactFirstName={contactFirstName}
            onContinue={goNext}
            continueLabel={continueLabel}
          />
        );
      case "discovery":
        return (
          <StepDiscoveryV2
            discoveryCategories={state.discoveryCategories}
            discoveryQualityRating={state.discoveryQualityRating}
            discoveryDuration={state.discoveryDuration}
            discoveryTriedBefore={state.discoveryTriedBefore}
            discoveryTriedResult={state.discoveryTriedResult}
            contactFirstName={contactFirstName}
            onCategoryToggle={toggleDiscoveryCategory}
            onQualityRatingChange={setDiscoveryQualityRating}
            onDurationChange={setDiscoveryDuration}
            onTriedBeforeChange={setDiscoveryTriedBefore}
            onTriedResultChange={setDiscoveryTriedResult}
            onContinue={goNext}
            continueLabel={continueLabel}
          />
        );
      case "samples":
        return (
          <StepSendSamples
            products={contactProducts}
            allProducts={allProducts}
            sampleAgreed={state.sampleAgreed}
            sampleProducts={state.sampleProducts}
            sampleAddress={state.sampleAddress}
            onSetSampleAgreed={setSampleAgreed}
            onToggleSampleProduct={toggleSampleProduct}
            onSetSampleAddress={setSampleAddress}
            onContinue={goNext}
            contactFirstName={contactFirstName}
            continueLabel={continueLabel}
            discoveryCategories={state.discoveryCategories}
            sampleQuantities={state.sampleQuantities}
            onSetSampleQuantity={setSampleQuantity}
          />
        );
      case "followup":
        return (
          <StepFollowUp
            contactId={activeContact?.id}
            followUpDay={followUpDay}
            onAdvance={handleAdvanceFollowUp}
            contactFirstName={contactFirstName}
            sampleReceived={state.sampleReceived}
            onSampleReceived={handleSampleReceived}
            continueLabel={continueLabel}
            onContinue={goNext}
            discoveryCategories={state.discoveryCategories}
            discoveryQualityRating={state.discoveryQualityRating}
            followupRatings={state.followupRatings}
            onFollowupRatingChange={setFollowupRating}
            sampleProducts={state.sampleProducts}
            sampleQuantities={state.sampleQuantities}
          />
        );
      case "close":
        return (
          <ProductTabs products={contactProducts}>
            {(product) => {
              const roadmap = roadmaps[product.id];
              if (!roadmap) return null;
              return (
                <StepClose
                  closingData={roadmap.sections["6_closing"]}
                  objectionData={roadmap.sections["5_objection_handling"]}
                  selectedTechnique={state.closingTechniques[product.id] || null}
                  encounteredObjections={(state.objectionsEncountered[product.id] || []).map(o => o.objection)}
                  onSelectTechnique={(t) => setClosingTechnique(product.id, t)}
                  onToggleObjection={(obj) => toggleObjection(product.id, obj)}
                  onContinue={goNext}
                  contactFirstName={contactFirstName}
                  baseline={state.discoveryQualityRating || undefined}
                  currentRating={getLatestRating(state.followupRatings)}
                  categoryLabel={joinCategoryLabels(state.discoveryCategories)}
                  continueLabel={continueLabel}
                />
              );
            }}
          </ProductTabs>
        );
      case "purchase_links":
        return (
          <ProductTabs products={contactProducts}>
            {(product) => (
              <StepPurchaseLinks
                product={product}
                storeSubdomain={storeSubdomain}
                contactFirstName={contactFirstName}
                allProducts={contactProducts}
                onSubdomainSaved={setStoreSubdomain}
                contactId={activeContact?.id}
                bydesignCustomerDid={activeContact?.bydesign_customer_did}
                bydesignMatchConfidence={activeContact?.bydesign_match_confidence}
                bydesignOrderCount={activeContact?.bydesign_order_count}
                bydesignTotalSpent={activeContact?.bydesign_total_spent}
              />
            )}
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

      {/* Sales flow stepper */}
      <div
        ref={stepsScrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-none snap-x snap-mandatory -mx-4 px-4 pb-1"
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
              <span className="whitespace-nowrap">
                {step.label}
              </span>
            </button>
          );
        })}
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

      {!isDrawer && !keyboardOpen && (
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
