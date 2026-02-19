"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin } from "lucide-react";
import { createContact, updateContact } from "@/lib/actions/contacts";
import { products } from "@/data/products";
import type { Contact, ContactInsert, ContactStep, ContactOutcome } from "@/lib/db/types";
import type { SampleAddress } from "@/components/sales-flow/step-send-samples";

interface ContactSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
  defaultProductId?: string;
  defaultStep?: string;
  defaultOpeningType?: string;
  defaultObjections?: string[];
  defaultClosingTechnique?: string;
  defaultQuestionsAsked?: string[];
  defaultSampleAgreed?: boolean;
  defaultSampleProductId?: string;
  defaultSampleAddress?: SampleAddress;
  onSaved?: () => void;
}

export function ContactSheet({
  open,
  onOpenChange,
  contact,
  defaultProductId,
  defaultStep,
  defaultOpeningType,
  defaultObjections,
  defaultClosingTechnique,
  defaultQuestionsAsked,
  defaultSampleAgreed,
  defaultSampleProductId,
  defaultSampleAddress,
  onSaved,
}: ContactSheetProps) {
  const isEdit = !!contact;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [productId, setProductId] = useState("");
  const [currentStep, setCurrentStep] = useState<ContactStep>("opening");
  const [openingType, setOpeningType] = useState("");
  const [closingTechnique, setClosingTechnique] = useState("");
  const [sampleSent, setSampleSent] = useState(false);
  const [sampleProduct, setSampleProduct] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [outcome, setOutcome] = useState<ContactOutcome>("pending");

  useEffect(() => {
    if (contact) {
      setName(contact.name);
      setEmail(contact.email || "");
      setPhone(contact.phone || "");
      setNotes(contact.notes || "");
      setProductId(contact.product_id);
      setCurrentStep(contact.current_step);
      setOpeningType(contact.opening_type || "");
      setClosingTechnique(contact.closing_technique || "");
      setSampleSent(contact.sample_sent);
      setSampleProduct(contact.sample_product || "");
      setAddressLine1(contact.address_line1 || "");
      setAddressLine2(contact.address_line2 || "");
      setAddressCity(contact.address_city || "");
      setAddressState(contact.address_state || "");
      setAddressZip(contact.address_zip || "");
      setOutcome(contact.outcome);
    } else {
      setName("");
      setEmail("");
      setPhone("");
      setNotes("");
      setProductId(defaultProductId || "");
      setCurrentStep((defaultStep as ContactStep) || "opening");
      setOpeningType(defaultOpeningType || "");
      setClosingTechnique(defaultClosingTechnique || "");
      setSampleSent(defaultSampleAgreed || false);
      setSampleProduct(defaultSampleProductId || "");
      setAddressLine1(defaultSampleAddress?.line1 || "");
      setAddressLine2(defaultSampleAddress?.line2 || "");
      setAddressCity(defaultSampleAddress?.city || "");
      setAddressState(defaultSampleAddress?.state || "");
      setAddressZip(defaultSampleAddress?.zip || "");
      setOutcome("pending");
    }
    setError(null);
  }, [contact, open, defaultProductId, defaultStep, defaultOpeningType, defaultClosingTechnique, defaultQuestionsAsked, defaultSampleAgreed, defaultSampleProductId, defaultSampleAddress]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !productId) {
      setError("Name and product are required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEdit && contact) {
        const { error: err } = await updateContact(contact.id, {
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          address_line1: addressLine1.trim() || null,
          address_line2: addressLine2.trim() || null,
          address_city: addressCity.trim() || null,
          address_state: addressState.trim() || null,
          address_zip: addressZip.trim() || null,
          notes: notes.trim() || null,
          product_id: productId,
          current_step: currentStep,
          opening_type: openingType || null,
          objections_encountered: defaultObjections || contact.objections_encountered || [],
          closing_technique: closingTechnique || null,
          questions_asked: defaultQuestionsAsked || contact.questions_asked || [],
          sample_sent: sampleSent,
          sample_sent_at: sampleSent ? new Date().toISOString() : null,
          sample_product: sampleProduct || null,
          outcome,
        });
        if (err) throw new Error(err);
      } else {
        const insertData: Omit<ContactInsert, "user_id"> = {
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          address_line1: addressLine1.trim() || null,
          address_line2: addressLine2.trim() || null,
          address_city: addressCity.trim() || null,
          address_state: addressState.trim() || null,
          address_zip: addressZip.trim() || null,
          notes: notes.trim() || null,
          product_id: productId,
          current_step: currentStep,
          opening_type: openingType || null,
          objections_encountered: defaultObjections || [],
          closing_technique: closingTechnique || null,
          questions_asked: defaultQuestionsAsked || [],
          sample_sent: sampleSent,
          sample_product: sampleProduct || null,
          outcome,
        };
        const { error: err } = await createContact(insertData);
        if (err) throw new Error(err);
      }

      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Contact" : "New Contact"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update this prospect's information."
              : "Save a prospect from your sales conversation."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Prospect name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Product *</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.emoji} {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Current Step</Label>
              <Select value={currentStep} onValueChange={(v) => setCurrentStep(v as ContactStep)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add_contact">Add Contact</SelectItem>
                  <SelectItem value="opening">Opening</SelectItem>
                  <SelectItem value="discovery">Discovery</SelectItem>
                  <SelectItem value="presentation">Presentation</SelectItem>
                  <SelectItem value="samples">Send Samples</SelectItem>
                  <SelectItem value="objections">Objections</SelectItem>
                  <SelectItem value="closing">Closing</SelectItem>
                  <SelectItem value="followup">Follow-Up</SelectItem>
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

          {(openingType || (defaultObjections && defaultObjections.length > 0) || closingTechnique || (defaultQuestionsAsked && defaultQuestionsAsked.length > 0)) && (
            <div className="space-y-2 rounded-lg border bg-muted/50 p-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Captured from Sales Flow
              </Label>
              <div className="grid gap-1.5 text-sm">
                {openingType && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Opening:</span>
                    <Badge variant="secondary">{openingType}</Badge>
                  </div>
                )}
                {defaultQuestionsAsked && defaultQuestionsAsked.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Discovery Questions Asked:</span>
                    <ul className="mt-1 ml-4 list-disc text-xs text-muted-foreground">
                      {defaultQuestionsAsked.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {defaultObjections && defaultObjections.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Objections:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {defaultObjections.map((obj, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {obj}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {closingTechnique && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Closing:</span>
                    <Badge variant="secondary">{closingTechnique}</Badge>
                  </div>
                )}
              </div>
            </div>
          )}

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
                  <Label>Sample Product</Label>
                  <Select value={sampleProduct} onValueChange={setSampleProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Which product?" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.emoji} {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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
                  <div className="grid grid-cols-5 gap-2">
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

          <SheetFooter className="pt-4">
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
              {isEdit ? "Update Contact" : "Save Contact"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
