"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Loader2,
  UserPlus,
} from "lucide-react";
import Image from "next/image";
import { createContact } from "@/lib/actions/contacts";
import { products as allProducts } from "@/data/products";
import type { Contact } from "@/lib/db/types";

interface StepAddContactProps {
  onContactCreated: (contact: Contact) => void;
  existingContact: Contact | null;
}

export function StepAddContact({
  onContactCreated,
  existingContact,
}: StepAddContactProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleProduct = (id: string) => {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError("First name and last name are required");
      return;
    }
    if (selectedProductIds.length === 0) {
      setError("Select at least one product");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await createContact({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        product_ids: selectedProductIds,
        current_step: "add_contact",
      });
      if (err) throw new Error(err);
      if (data) onContactCreated(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create contact");
    } finally {
      setLoading(false);
    }
  };

  if (existingContact) {
    const contactProducts = allProducts.filter(p => existingContact.product_ids.includes(p.id));
    return (
      <div className="space-y-4">
        <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="size-5 text-green-600 dark:text-green-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  Continuing with {existingContact.first_name} {existingContact.last_name}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {existingContact.email || existingContact.phone || "No contact details"}
                </p>
                {contactProducts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {contactProducts.map(p => (
                      <Badge key={p.id} variant="secondary" className="text-[10px] flex items-center gap-1">
                        <div className="relative size-3.5 rounded-full overflow-hidden">
                          <Image src={p.image} alt={p.name} fill className="object-cover" sizes="14px" />
                        </div>
                        {p.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <UserPlus className="size-4" />
            Who are you speaking with?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="contact-first-name">First Name *</Label>
              <Input
                id="contact-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-last-name">Last Name *</Label>
              <Input
                id="contact-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-phone">Phone</Label>
              <Input
                id="contact-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Which products are you presenting? *
        </Label>
        <p className="text-xs text-muted-foreground">
          Select one or more products for this conversation.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {allProducts.map((product) => {
            const isSelected = selectedProductIds.includes(product.id);
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => toggleProduct(product.id)}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                  isSelected
                    ? "ring-2 ring-primary border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="relative size-8 flex-shrink-0 rounded-full overflow-hidden bg-muted">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="32px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium block truncate">{product.name}</span>
                  <span className="text-[10px] text-muted-foreground block truncate">{product.tagline}</span>
                </div>
                {isSelected && (
                  <CheckCircle className="size-4 text-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>
        {selectedProductIds.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {selectedProductIds.length} product{selectedProductIds.length !== 1 ? "s" : ""} selected
          </p>
        )}
      </div>

      <Button
        onClick={handleCreate}
        disabled={loading || !firstName.trim() || !lastName.trim() || selectedProductIds.length === 0}
        className="w-full"
      >
        {loading ? (
          <Loader2 className="size-4 mr-1.5 animate-spin" />
        ) : (
          <UserPlus className="size-4 mr-1.5" />
        )}
        Create Contact & Continue
      </Button>
    </div>
  );
}
