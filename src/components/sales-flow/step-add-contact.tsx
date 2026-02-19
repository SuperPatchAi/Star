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
  Users,
  AlertTriangle,
  Heart,
  Loader2,
  UserPlus,
} from "lucide-react";
import { createContact } from "@/lib/actions/contacts";
import type { RoadmapCustomerProfile } from "@/types/roadmap";
import type { Product } from "@/types";
import type { Contact } from "@/lib/db/types";

interface StepAddContactProps {
  customerProfileData: RoadmapCustomerProfile;
  product: Product;
  onContactCreated: (contact: Contact) => void;
  existingContact: Contact | null;
}

export function StepAddContact({
  customerProfileData,
  product,
  onContactCreated,
  existingContact,
}: StepAddContactProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await createContact({
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        product_id: product.id,
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

  const data = customerProfileData;

  return (
    <div className="space-y-4">
      {existingContact ? (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="size-5 text-green-600 dark:text-green-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  Continuing with {existingContact.name}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {existingContact.email || existingContact.phone || "No contact details"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
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
            <div className="space-y-2">
              <Label htmlFor="contact-name">Name *</Label>
              <Input
                id="contact-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Prospect name"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={loading || !name.trim()} className="w-full">
              {loading ? (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              ) : (
                <UserPlus className="size-4 mr-1.5" />
              )}
              Create Contact & Continue
            </Button>
          </CardContent>
        </Card>
      )}

      <Separator />

      <p className="text-sm text-muted-foreground">
        Review the ideal customer profile for {product.name}. Does your prospect match?
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {data.content.demographics.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="size-4 text-blue-500" />
                Demographics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {data.content.demographics.map((item, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <CheckCircle className="size-3.5 text-blue-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="size-4 text-orange-500" />
              Pain Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {data.content.pain_points.map((item, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <Heart className="size-3.5 text-orange-500 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {data.content.psychographics.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Psychographics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {data.content.psychographics.map((item, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {item}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {data.content.tried_before.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">What They&apos;ve Tried</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {data.content.tried_before.map((item, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {item}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
