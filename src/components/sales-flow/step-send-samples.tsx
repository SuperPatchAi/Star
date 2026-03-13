"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, ChevronRight, MapPin, Check, Info, Phone } from "lucide-react";
import { ShareCopyButton } from "@/components/ui/share-copy-button";
import { interpolateScript } from "@/lib/interpolate-script";
import Image from "next/image";
import type { Product } from "@/types";

export interface SampleAddress {
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
}

interface StepSendSamplesProps {
  products: Product[];
  sampleAgreed: boolean;
  sampleProducts: string[];
  sampleAddress: SampleAddress | null;
  onSetSampleAgreed: (agreed: boolean) => void;
  onToggleSampleProduct: (productId: string) => void;
  onSetSampleAddress: (address: SampleAddress) => void;
  onContinue: () => void;
  contactFirstName?: string;
}

const SAMPLE_OFFER_SCRIPT = `{{FirstName}}, I don't give these to everyone. I only share them with people who are open to really experiencing something. If I sent you some, would you actually try them with me live so we can maximize the experience?`;

const COMMITMENT_SCRIPT = `Call me as soon as you get my package. Do not open or use it until we're on the phone. OK?`;

export const EXPERIENCE_SCRIPT = `Before we open it, I want you to understand. This isn't about hype. It's about experience. I want you to pay attention to what you notice, not what you expect.`;

export function StepSendSamples({
  products,
  sampleAgreed,
  sampleProducts,
  sampleAddress,
  onSetSampleAgreed,
  onToggleSampleProduct,
  onSetSampleAddress,
  onContinue,
  contactFirstName,
}: StepSendSamplesProps) {
  const address = sampleAddress || { line1: "", line2: "", city: "", state: "", zip: "" };
  const offerScript = useMemo(() => interpolateScript(SAMPLE_OFFER_SCRIPT, contactFirstName), [contactFirstName]);
  const commitmentScript = useMemo(() => interpolateScript(COMMITMENT_SCRIPT, contactFirstName), [contactFirstName]);
  const experienceScript = useMemo(() => interpolateScript(EXPERIENCE_SCRIPT, contactFirstName), [contactFirstName]);

  const handleAddressChange = (field: keyof SampleAddress, value: string) => {
    onSetSampleAddress({ ...address, [field]: value });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Offer a sample to build commitment. Only share with people who are open to the experience.
      </p>

      {/* Script 1: Sample offer */}
      <div className="border-b pb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Package className="size-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Sample Offer Script</span>
          </div>
          <ShareCopyButton
            text={offerScript}
            variant="icon"
            className="size-7"
            iconClassName="size-3.5"
          />
        </div>
        <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap">
          {offerScript}
        </div>
      </div>

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
          {/* Script 2: Commitment */}
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:bg-blue-950 dark:border-blue-800 group">
            <Info className="size-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-700 dark:text-blue-300 flex-1">
              <strong>After they agree:</strong> {commitmentScript}
            </p>
            <ShareCopyButton text={commitmentScript} className="size-9 min-h-[44px] min-w-[44px] shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Script 3: Experience (follow-up call preview) */}
          <div className="rounded-lg border border-dashed border-muted-foreground/30 p-3 group">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="size-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">On the follow-up call (2 days)</span>
            </div>
            <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap relative">
              {experienceScript}
              <ShareCopyButton text={experienceScript} className="absolute top-2 right-2 size-9 min-h-[44px] min-w-[44px] md:opacity-0 md:group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Which products to send?</Label>
            <div className="grid grid-cols-2 gap-2">
              {products.map((product) => {
                const isSelected = sampleProducts.includes(product.id);
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => onToggleSampleProduct(product.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? "ring-2 ring-primary border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="relative size-7 flex-shrink-0 rounded-full overflow-hidden bg-muted">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="28px"
                      />
                    </div>
                    <span className="text-sm truncate">{product.name}</span>
                    {isSelected && <Check className="size-3.5 text-primary shrink-0 ml-auto" />}
                  </button>
                );
              })}
            </div>
            {sampleProducts.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {sampleProducts.length} product{sampleProducts.length !== 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          {/* Shipping address */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="size-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Shipping Address</span>
            </div>
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
            <div className="space-y-2 sm:hidden">
              <div className="space-y-2">
                <Label htmlFor="addr-city-m">City *</Label>
                <Input
                  id="addr-city-m"
                  value={address.city}
                  onChange={(e) => handleAddressChange("city", e.target.value)}
                  placeholder="City"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="addr-state-m">State *</Label>
                  <Input
                    id="addr-state-m"
                    value={address.state}
                    onChange={(e) => handleAddressChange("state", e.target.value)}
                    placeholder="ST"
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addr-zip-m">ZIP *</Label>
                  <Input
                    id="addr-zip-m"
                    value={address.zip}
                    onChange={(e) => handleAddressChange("zip", e.target.value)}
                    placeholder="12345"
                    maxLength={10}
                  />
                </div>
              </div>
            </div>
            <div className="hidden sm:grid grid-cols-5 gap-3">
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
          </div>
        </div>
      )}

      <Button onClick={onContinue} className="w-full">
        Continue to Objections
        <ChevronRight className="size-4 ml-1" />
      </Button>
    </div>
  );
}
