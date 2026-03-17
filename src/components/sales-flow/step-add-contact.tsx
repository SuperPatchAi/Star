"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle,
  Loader2,
  UserPlus,
} from "lucide-react";
import { createContact } from "@/lib/actions/contacts";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError("First name and last name are required");
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
        product_ids: [],
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

      <Button
        onClick={handleCreate}
        disabled={loading || !firstName.trim() || !lastName.trim()}
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
