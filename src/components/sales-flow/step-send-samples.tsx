"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, ChevronRight, MapPin, Copy, Check } from "lucide-react";
import { useState } from "react";
import { products } from "@/data/products";
import type { Product } from "@/types";

export interface SampleAddress {
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
}

interface StepSendSamplesProps {
  product: Product;
  sampleAgreed: boolean;
  sampleProductId: string | null;
  sampleAddress: SampleAddress | null;
  onSetSampleAgreed: (agreed: boolean) => void;
  onSetSampleProductId: (productId: string) => void;
  onSetSampleAddress: (address: SampleAddress) => void;
  onContinue: () => void;
}

const SAMPLE_SCRIPT = `Based on what you've shared with me, I think the best next step would be for you to try it yourself. I'd love to send you a sample so you can experience the results firsthand — no commitment, just a chance to see how it works for you. What's the best address to send that to?`;

export function StepSendSamples({
  product,
  sampleAgreed,
  sampleProductId,
  sampleAddress,
  onSetSampleAgreed,
  onSetSampleProductId,
  onSetSampleAddress,
  onContinue,
}: StepSendSamplesProps) {
  const [copied, setCopied] = useState(false);

  const address = sampleAddress || { line1: "", line2: "", city: "", state: "", zip: "" };

  const handleAddressChange = (field: keyof SampleAddress, value: string) => {
    onSetSampleAddress({ ...address, [field]: value });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(SAMPLE_SCRIPT.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        After your presentation, transition into offering a sample. This builds commitment and gives the prospect a tangible reason to follow up.
      </p>

      {/* Script card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <Package className="size-3 mr-1" />
                Sample Offer Script
              </Badge>
            </CardTitle>
            <Button variant="ghost" size="icon" className="size-7" onClick={handleCopy}>
              {copied ? (
                <Check className="size-3.5 text-green-500" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap">
            {SAMPLE_SCRIPT}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Agreement checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="sample-agreed"
          checked={sampleAgreed}
          onCheckedChange={(checked) => onSetSampleAgreed(checked === true)}
        />
        <Label htmlFor="sample-agreed" className="text-sm font-medium">
          Prospect agreed to receive a sample
        </Label>
      </div>

      {sampleAgreed && (
        <div className="space-y-4 animate-in fade-in-0 slide-in-from-top-2 duration-200">
          {/* Product selector */}
          <div className="space-y-2">
            <Label>Which product to send?</Label>
            <Select value={sampleProductId || ""} onValueChange={onSetSampleProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.emoji} {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!sampleProductId && (
              <p className="text-xs text-muted-foreground">
                Defaults to {product.emoji} {product.name} if left blank
              </p>
            )}
          </div>

          {/* Shipping address */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="size-4" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="addr-line1">Street Address *</Label>
                <Input
                  id="addr-line1"
                  value={address.line1}
                  onChange={(e) => handleAddressChange("line1", e.target.value)}
                  placeholder="123 Main St"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addr-line2">Apt / Suite / Unit</Label>
                <Input
                  id="addr-line2"
                  value={address.line2}
                  onChange={(e) => handleAddressChange("line2", e.target.value)}
                  placeholder="Apt 4B"
                />
              </div>
              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="addr-city">City *</Label>
                  <Input
                    id="addr-city"
                    value={address.city}
                    onChange={(e) => handleAddressChange("city", e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div className="col-span-1 space-y-2">
                  <Label htmlFor="addr-state">State *</Label>
                  <Input
                    id="addr-state"
                    value={address.state}
                    onChange={(e) => handleAddressChange("state", e.target.value)}
                    placeholder="ST"
                    maxLength={2}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="addr-zip">ZIP *</Label>
                  <Input
                    id="addr-zip"
                    value={address.zip}
                    onChange={(e) => handleAddressChange("zip", e.target.value)}
                    placeholder="12345"
                    maxLength={10}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Button onClick={onContinue} className="w-full">
        Continue to Objections
        <ChevronRight className="size-4 ml-1" />
      </Button>
    </div>
  );
}
