"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  MapPin,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  Pencil,
  X,
  Check,
  Plus,
  Package,
  ChevronDown,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import Image from "next/image";
import { createContact, updateContact, updateContactOutcome } from "@/lib/actions/contacts";
import { products } from "@/data/products";
import { SALES_STEPS } from "@/types/roadmap";
import { cn } from "@/lib/utils";
import { DecisionTree } from "@/components/sales-flow/decision-tree";
import type { Contact, ContactInsert, ContactStep, ContactOutcome } from "@/lib/db/types";
import { getCategoriesByKeys, DURATION_OPTIONS } from "@/data/discovery-categories";

interface ContactSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
  onSaved?: () => void;
}

const STEP_LABELS: Record<string, string> = {};
for (const s of SALES_STEPS) {
  STEP_LABELS[s.id] = s.label;
}
STEP_LABELS["closed"] = "Closed";

function getStepIndex(step: string): number {
  const idx = SALES_STEPS.findIndex((s) => s.id === step);
  return idx >= 0 ? idx : -1;
}

function getRatingLabel(value: number): string {
  if (value <= 2) return "Terrible";
  if (value <= 4) return "Poor";
  if (value === 5) return "Okay";
  if (value <= 7) return "Good";
  if (value <= 9) return "Great";
  return "Excellent";
}

function getRatingColor(value: number): string {
  if (value <= 3) return "text-red-600 dark:text-red-400";
  if (value <= 5) return "text-amber-600 dark:text-amber-400";
  if (value <= 7) return "text-blue-600 dark:text-blue-400";
  return "text-green-600 dark:text-green-400";
}

function DiscoveryInsights({ contact }: { contact: Contact }) {
  const categories = getCategoriesByKeys(contact.discovery_category ?? []);
  const rating = contact.discovery_quality_rating;
  const duration = contact.discovery_duration;
  const durationLabel = DURATION_OPTIONS.find(d => d.value === duration)?.label ?? duration;
  const triedBefore = contact.discovery_tried_before ?? [];
  const triedResult = contact.discovery_tried_result;

  const hasAnyDetail = rating !== null || duration || triedBefore.length > 0 || triedResult;
  if (categories.length === 0 && !hasAnyDetail) return null;

  return (
    <div className="px-4 pb-3">
      <div className="rounded-lg border bg-muted/30 p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
            Discovery Insights
          </p>
          {rating !== null && (
            <span className={cn("text-xs font-bold", getRatingColor(rating))}>
              Baseline: {rating}/10
            </span>
          )}
        </div>

        {categories.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Focus Areas</p>
            <div className="flex flex-wrap gap-1">
              {categories.map((cat) => (
                <span
                  key={cat.key}
                  className="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs font-medium"
                >
                  {cat.label}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          {rating !== null && (
            <>
              <span className="text-muted-foreground">Quality Rating</span>
              <span className={cn("font-medium", getRatingColor(rating))}>
                {rating}/10 &middot; {getRatingLabel(rating)}
              </span>
            </>
          )}
          {duration && (
            <>
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium">{durationLabel}</span>
            </>
          )}
        </div>

        {triedBefore.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Previously Tried</p>
            <div className="flex flex-wrap gap-1">
              {triedBefore.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center rounded-full bg-background border px-2 py-0.5 text-xs"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {triedResult && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">How It Worked Out</p>
            <p className="text-sm italic text-foreground/80">
              &ldquo;{triedResult}&rdquo;
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ViewMode({
  contact,
  onEdit,
  onSaved,
  onClose,
}: {
  contact: Contact;
  onEdit: () => void;
  onSaved?: () => void;
  onClose: () => void;
}) {
  const [acting, setActing] = useState(false);
  const [localContact, setLocalContact] = useState(contact);
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressDraft, setAddressDraft] = useState({
    line1: "", line2: "", city: "", state: "", zip: "",
  });
  const [savingAddress, setSavingAddress] = useState(false);

  useEffect(() => {
    setLocalContact(contact);
  }, [contact]);

  const fullName = `${localContact.first_name} ${localContact.last_name}`;
  const contactProducts = products.filter((p) => localContact.product_ids.includes(p.id));
  const stepIndex = getStepIndex(localContact.current_step);
  const stepLabel = STEP_LABELS[localContact.current_step] || localContact.current_step;
  const progress = stepIndex >= 0 ? ((stepIndex + 1) / SALES_STEPS.length) * 100 : 0;

  const handleOutcome = useCallback(async (value: "won" | "lost") => {
    setActing(true);
    try {
      await updateContactOutcome(localContact.id, value);
      setLocalContact((prev) => ({ ...prev, outcome: value }));
      onSaved?.();
    } finally {
      setActing(false);
    }
  }, [localContact.id, onSaved]);

  const handleContactUpdated = useCallback((updates: Record<string, unknown>) => {
    setLocalContact((prev) => ({ ...prev, ...updates } as Contact));
  }, []);

  const openAddressEdit = useCallback(() => {
    setAddressDraft({
      line1: localContact.address_line1 || "",
      line2: localContact.address_line2 || "",
      city: localContact.address_city || "",
      state: localContact.address_state || "",
      zip: localContact.address_zip || "",
    });
    setEditingAddress(true);
  }, [localContact]);

  const saveAddress = useCallback(async () => {
    setSavingAddress(true);
    try {
      const updates = {
        address_line1: addressDraft.line1.trim() || null,
        address_line2: addressDraft.line2.trim() || null,
        address_city: addressDraft.city.trim() || null,
        address_state: addressDraft.state.trim() || null,
        address_zip: addressDraft.zip.trim() || null,
      };
      await updateContact(localContact.id, updates);
      setLocalContact((prev) => ({ ...prev, ...updates }));
      setEditingAddress(false);
    } finally {
      setSavingAddress(false);
    }
  }, [localContact.id, addressDraft]);

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <button onClick={onClose} className="p-1 -ml-1" aria-label="Close">
          <X className="size-5 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-1">
          {localContact.sample_sent && (
            <div
              className="relative size-9 flex items-center justify-center"
              title={localContact.sample_followup_done ? "Samples received" : "Samples sent — awaiting delivery"}
            >
              <Package className={cn(
                "size-4",
                localContact.sample_followup_done
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-500 dark:text-red-400"
              )} />
            </div>
          )}
          {localContact.phone && (
            <Button variant="ghost" size="icon" className="size-9" asChild>
              <a href={`tel:${localContact.phone}`} aria-label="Call">
                <Phone className="size-4" />
              </a>
            </Button>
          )}
          {localContact.email && (
            <Button variant="ghost" size="icon" className="size-9" asChild>
              <a href={`mailto:${localContact.email}`} aria-label="Email">
                <Mail className="size-4" />
              </a>
            </Button>
          )}
          <Button variant="ghost" size="icon" className="size-9" onClick={onEdit} aria-label="Edit">
            <Pencil className="size-4" />
          </Button>
        </div>
      </div>

      {/* Scrollable stacked content */}
      <div className="flex-1 overflow-y-auto">
        {/* Contact summary with inline contact info */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start gap-3">
            {contactProducts.length > 0 && (
              <div className="flex -space-x-1.5 mt-0.5">
                {contactProducts.slice(0, 3).map((p) => (
                  <div key={p.id} className="relative size-8 rounded-full overflow-hidden border-2 border-background">
                    <Image src={p.image} alt={p.name} fill className="object-cover" sizes="32px" />
                  </div>
                ))}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold truncate">{fullName}</h2>
              <p className="text-sm text-muted-foreground truncate">
                {contactProducts.map((p) => p.name).join(", ")}
              </p>
              {(localContact.email || localContact.phone) && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                  {localContact.email && (
                    <a href={`mailto:${localContact.email}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                      <Mail className="size-3" />
                      {localContact.email}
                    </a>
                  )}
                  {localContact.phone && (
                    <a href={`tel:${localContact.phone}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                      <Phone className="size-3" />
                      {localContact.phone}
                    </a>
                  )}
                </div>
              )}
              {editingAddress ? (
                <div className="mt-2 space-y-2">
                  <Input
                    placeholder="Street address"
                    value={addressDraft.line1}
                    onChange={(e) => setAddressDraft(d => ({ ...d, line1: e.target.value }))}
                    className="h-8 text-xs"
                  />
                  <Input
                    placeholder="Apt / Suite / Unit"
                    value={addressDraft.line2}
                    onChange={(e) => setAddressDraft(d => ({ ...d, line2: e.target.value }))}
                    className="h-8 text-xs"
                  />
                  <div className="grid grid-cols-5 gap-1.5">
                    <Input
                      placeholder="City"
                      value={addressDraft.city}
                      onChange={(e) => setAddressDraft(d => ({ ...d, city: e.target.value }))}
                      className="col-span-2 h-8 text-xs"
                    />
                    <Input
                      placeholder="ST"
                      value={addressDraft.state}
                      onChange={(e) => setAddressDraft(d => ({ ...d, state: e.target.value }))}
                      maxLength={2}
                      className="col-span-1 h-8 text-xs"
                    />
                    <Input
                      placeholder="ZIP"
                      value={addressDraft.zip}
                      onChange={(e) => setAddressDraft(d => ({ ...d, zip: e.target.value }))}
                      maxLength={10}
                      className="col-span-2 h-8 text-xs"
                    />
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      className="h-7 text-xs flex-1"
                      onClick={saveAddress}
                      disabled={savingAddress}
                    >
                      {savingAddress ? <Loader2 className="size-3 animate-spin mr-1" /> : <Check className="size-3 mr-1" />}
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => setEditingAddress(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : localContact.address_line1 ? (
                <button
                  type="button"
                  onClick={openAddressEdit}
                  className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate hover:text-foreground transition-colors group"
                >
                  <MapPin className="size-3 shrink-0" />
                  {[localContact.address_line1, localContact.address_line2, localContact.address_city, localContact.address_state, localContact.address_zip].filter(Boolean).join(", ")}
                  <Pencil className="size-2.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openAddressEdit}
                  className="text-xs text-muted-foreground flex items-center gap-1 mt-1 hover:text-foreground transition-colors"
                >
                  <Plus className="size-3 shrink-0" />
                  Add address
                </button>
              )}
            </div>
          </div>

          {/* Inline stage + outcome */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium">{stepLabel}</p>
              {(localContact.outcome === "won" || localContact.outcome === "lost") && (
                <span className={cn(
                  "text-xs font-medium flex items-center gap-1",
                  localContact.outcome === "won" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {localContact.outcome === "won" ? <CheckCircle className="size-3" /> : <XCircle className="size-3" />}
                  {localContact.outcome === "won" ? "Won" : "Lost"}
                </span>
              )}
            </div>
            <Progress value={progress} className="h-1.5" />

            {(localContact.outcome === "pending" || localContact.outcome === "follow_up") && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
                  onClick={() => handleOutcome("won")}
                  disabled={acting}
                >
                  <CheckCircle className="size-3.5 mr-1" />
                  Won
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                  onClick={() => handleOutcome("lost")}
                  disabled={acting}
                >
                  <XCircle className="size-3.5 mr-1" />
                  Lost
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Discovery Insights */}
        {(localContact.discovery_category?.length > 0 || localContact.discovery_quality_rating !== null) && (
          <DiscoveryInsights contact={localContact} />
        )}

        {/* Divider before sales flow */}
        <div className="border-t mx-4 mb-4" />

        {/* Full DecisionTree */}
        <div className="px-4 pb-6">
          <DecisionTree
            key={localContact.id}
            initialContact={localContact}
            variant="drawer"
            onContactUpdated={handleContactUpdated}
          />
        </div>
      </div>
    </div>
  );
}

function NewContactFlow({
  onSaved,
  onClose,
}: {
  onSaved?: () => void;
  onClose: () => void;
}) {
  const [createdContact, setCreatedContact] = useState<Contact | null>(null);

  const handleContactCreated = useCallback((contact: Contact) => {
    setCreatedContact(contact);
    onSaved?.();
  }, [onSaved]);

  if (createdContact) {
    return (
      <ViewMode
        contact={createdContact}
        onEdit={() => {}}
        onSaved={onSaved}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <button onClick={onClose} className="p-1 -ml-1" aria-label="Close">
          <X className="size-5 text-muted-foreground" />
        </button>
        <span className="text-sm font-semibold">New Conversation</span>
        <div className="size-7" />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <DecisionTree
          variant="drawer"
          onContactCreated={handleContactCreated}
        />
      </div>
    </div>
  );
}

function EditMode({
  contact,
  onCancel,
  onSaved,
  onClose,
}: {
  contact?: Contact | null;
  onCancel?: () => void;
  onSaved?: () => void;
  onClose: () => void;
}) {
  const isEdit = !!contact;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<ContactStep>("add_contact");
  const [sampleSent, setSampleSent] = useState(false);
  const [sampleProducts, setSampleProducts] = useState<string[]>([]);
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [outcome, setOutcome] = useState<ContactOutcome>("pending");

  const toggleProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    if (contact) {
      setFirstName(contact.first_name);
      setLastName(contact.last_name);
      setEmail(contact.email || "");
      setPhone(contact.phone || "");
      setNotes(contact.notes || "");
      setSelectedProductIds(contact.product_ids || []);
      setCurrentStep(contact.current_step);
      setSampleSent(contact.sample_sent);
      setSampleProducts(contact.sample_products || []);
      setAddressLine1(contact.address_line1 || "");
      setAddressLine2(contact.address_line2 || "");
      setAddressCity(contact.address_city || "");
      setAddressState(contact.address_state || "");
      setAddressZip(contact.address_zip || "");
      setOutcome(contact.outcome);
    } else {
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setNotes("");
      setSelectedProductIds([]);
      setCurrentStep("add_contact");
      setSampleSent(false);
      setSampleProducts([]);
      setAddressLine1("");
      setAddressLine2("");
      setAddressCity("");
      setAddressState("");
      setAddressZip("");
      setOutcome("pending");
    }
    setError(null);
  }, [contact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || selectedProductIds.length === 0) {
      setError("First name, last name, and at least one product are required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEdit && contact) {
        const { error: err } = await updateContact(contact.id, {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          address_line1: addressLine1.trim() || null,
          address_line2: addressLine2.trim() || null,
          address_city: addressCity.trim() || null,
          address_state: addressState.trim() || null,
          address_zip: addressZip.trim() || null,
          notes: notes.trim() || null,
          product_ids: selectedProductIds,
          current_step: currentStep,
          sample_sent: sampleSent,
          sample_sent_at: sampleSent ? new Date().toISOString() : null,
          sample_products: sampleProducts,
          outcome,
        });
        if (err) throw new Error(err);
      } else {
        const insertData: Omit<ContactInsert, "user_id"> = {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          address_line1: addressLine1.trim() || null,
          address_line2: addressLine2.trim() || null,
          address_city: addressCity.trim() || null,
          address_state: addressState.trim() || null,
          address_zip: addressZip.trim() || null,
          notes: notes.trim() || null,
          product_ids: selectedProductIds,
          current_step: currentStep,
          sample_sent: sampleSent,
          sample_products: sampleProducts,
          outcome,
        };
        const { error: err } = await createContact(insertData);
        if (err) throw new Error(err);
      }

      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-base font-semibold">
          {isEdit ? "Edit Contact" : "New Contact"}
        </h2>
        <div className="flex items-center gap-1">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="first-name">First Name *</Label>
            <Input
              id="first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last-name">Last Name *</Label>
            <Input
              id="last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Products * ({selectedProductIds.length} selected)</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[200px] overflow-y-auto rounded-lg border p-2">
            {products.map((p) => {
              const isSelected = selectedProductIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleProduct(p.id)}
                  className={`flex items-center gap-1.5 p-1.5 rounded text-left transition-all text-xs ${
                    isSelected ? "bg-primary/10 font-medium" : "hover:bg-muted"
                  }`}
                >
                  <div className="relative size-5 flex-shrink-0 rounded-full overflow-hidden">
                    <Image src={p.image} alt={p.name} fill className="object-cover" sizes="20px" />
                  </div>
                  <span className="truncate">{p.name}</span>
                  {isSelected && <CheckCircle className="size-3 text-primary shrink-0 ml-auto" />}
                </button>
              );
            })}
          </div>
        </div>

        <Collapsible>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors [&[data-state=open]>svg]:rotate-180">
            Advanced
            <ChevronDown className="size-4 transition-transform" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
              <div className="space-y-2">
                <Label>Current Step</Label>
                <Select value={currentStep} onValueChange={(v) => setCurrentStep(v as ContactStep)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SALES_STEPS.map((step) => (
                      <SelectItem key={step.id} value={step.id}>{step.label}</SelectItem>
                    ))}
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Outcome</Label>
                <Select value={outcome} onValueChange={(v) => setOutcome(v as ContactOutcome)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                    <SelectItem value="follow_up">Follow Up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes about this conversation..."
            rows={3}
          />
        </div>

        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="sample"
              checked={sampleSent}
              onCheckedChange={(checked) => setSampleSent(checked === true)}
            />
            <Label htmlFor="sample" className="text-sm font-normal">
              Sample sent to this prospect
            </Label>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                Shipping Address
              </Label>
              <Input
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="Street address"
              />
              <Input
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                placeholder="Apt / Suite / Unit"
              />
              <div className="space-y-2 sm:hidden">
                <Input
                  value={addressCity}
                  onChange={(e) => setAddressCity(e.target.value)}
                  placeholder="City"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={addressState}
                    onChange={(e) => setAddressState(e.target.value)}
                    placeholder="ST"
                    maxLength={2}
                  />
                  <Input
                    value={addressZip}
                    onChange={(e) => setAddressZip(e.target.value)}
                    placeholder="ZIP"
                    maxLength={10}
                  />
                </div>
              </div>
              <div className="hidden sm:grid grid-cols-5 gap-2">
                <Input
                  className="col-span-2"
                  value={addressCity}
                  onChange={(e) => setAddressCity(e.target.value)}
                  placeholder="City"
                />
                <Input
                  className="col-span-1"
                  value={addressState}
                  onChange={(e) => setAddressState(e.target.value)}
                  placeholder="ST"
                  maxLength={2}
                />
                <Input
                  className="col-span-2"
                  value={addressZip}
                  onChange={(e) => setAddressZip(e.target.value)}
                  placeholder="ZIP"
                  maxLength={10}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 pb-2">
          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
            {isEdit ? "Update Contact" : "Save Contact"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function ContactSheet({
  open,
  onOpenChange,
  contact,
  onSaved,
}: ContactSheetProps) {
  const hasContact = !!contact;
  const [mode, setMode] = useState<"view" | "edit" | "new-flow">("view");

  useEffect(() => {
    if (open) {
      setMode(hasContact ? "view" : "new-flow");
    }
  }, [open, hasContact]);

  const handleClose = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-full sm:max-w-full p-0 flex flex-col [&>button]:hidden">
        <SheetTitle className="sr-only">
          {contact ? `${contact.first_name} ${contact.last_name}` : "New Contact"}
        </SheetTitle>
        {mode === "view" && contact ? (
          <ViewMode
            contact={contact}
            onEdit={() => setMode("edit")}
            onSaved={onSaved}
            onClose={handleClose}
          />
        ) : mode === "new-flow" ? (
          <NewContactFlow
            onSaved={onSaved}
            onClose={handleClose}
          />
        ) : (
          <EditMode
            contact={contact}
            onCancel={hasContact ? () => setMode("view") : undefined}
            onSaved={onSaved}
            onClose={handleClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
