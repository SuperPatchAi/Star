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
} from "lucide-react";
import Image from "next/image";
import { createContact, updateContact, updateContactOutcome } from "@/lib/actions/contacts";
import { products } from "@/data/products";
import { SALES_STEPS } from "@/types/roadmap";
import { cn } from "@/lib/utils";
import { DecisionTree } from "@/components/sales-flow/decision-tree";
import type { Contact, ContactInsert, ContactStep, ContactOutcome } from "@/lib/db/types";

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

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <button onClick={onClose} className="p-1 -ml-1" aria-label="Close">
          <X className="size-5 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-1">
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

        {/* Divider before sales flow */}
        <div className="border-t mx-4 mb-4" />

        {/* Full DecisionTree */}
        <div className="px-4 pb-6">
          <DecisionTree
            key={localContact.id}
            initialContact={localContact}
            variant="drawer"
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
  const [currentStep, setCurrentStep] = useState<ContactStep>("opening");
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
      setCurrentStep("opening");
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          {sampleSent && (
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
          )}
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
