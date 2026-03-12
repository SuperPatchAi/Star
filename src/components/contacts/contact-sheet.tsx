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
import { Loader2, MapPin, CheckCircle } from "lucide-react";
import Image from "next/image";
import { createContact, updateContact } from "@/lib/actions/contacts";
import { products } from "@/data/products";
import type { Contact, ContactInsert, ContactStep, ContactOutcome } from "@/lib/db/types";

interface ContactSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
  onSaved?: () => void;
}

export function ContactSheet({
  open,
  onOpenChange,
  contact,
  onSaved,
}: ContactSheetProps) {
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
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
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
  }, [contact, open]);

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

          <div className="grid grid-cols-2 gap-3">
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
            <Label>Products * ({selectedProductIds.length} selected)</Label>
            <div className="grid grid-cols-2 gap-1.5 max-h-[200px] overflow-y-auto rounded-lg border p-2">
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
