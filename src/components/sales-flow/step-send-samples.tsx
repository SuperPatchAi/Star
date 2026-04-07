"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  Package,
  ChevronRight,
  ChevronDown,
  MapPin,
  Check,
  Info,
  Sparkles,
  Minus,
  Plus,
} from "lucide-react";
import { ShareCopyButton } from "@/components/ui/share-copy-button";
import { interpolateScript } from "@/lib/interpolate-script";
import { getCategoriesByKeys } from "@/data/discovery-categories";
import { getProductById } from "@/data/products";
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
  allProducts: Product[];
  sampleAgreed: boolean;
  sampleProducts: string[];
  sampleAddress: SampleAddress | null;
  onSetSampleAgreed: (agreed: boolean) => void;
  onToggleSampleProduct: (productId: string) => void;
  onSetSampleAddress: (address: SampleAddress) => void;
  onContinue: () => void;
  contactFirstName?: string;
  continueLabel?: string;
  discoveryCategories: string[];
  sampleQuantities: Record<string, number>;
  onSetSampleQuantity: (productId: string, qty: number) => void;
}

const SAMPLE_OFFER_SCRIPT = `{{FirstName}}, I have something that might really help with what you're dealing with. I don't share these with everyone — only people who are genuinely open to trying something different. If I sent you some samples, would you try them with me so we can see how they work for you?`;

const COMMITMENT_SCRIPT = `I'm sending you some amazing things right now to try out. I'm also sending you a special gift. When you get the patches, call me — I want to walk you through how to use them to get the best results. Okay?`;

export function StepSendSamples({
  products,
  allProducts,
  sampleAgreed,
  sampleProducts,
  sampleAddress,
  onSetSampleAgreed,
  onToggleSampleProduct,
  onSetSampleAddress,
  onContinue,
  contactFirstName,
  continueLabel = "Continue",
  discoveryCategories,
  sampleQuantities,
  onSetSampleQuantity,
}: StepSendSamplesProps) {
  const address = sampleAddress || { line1: "", line2: "", city: "", state: "", zip: "" };
  const offerScript = useMemo(() => interpolateScript(SAMPLE_OFFER_SCRIPT, contactFirstName), [contactFirstName]);
  const commitmentScript = useMemo(() => interpolateScript(COMMITMENT_SCRIPT, contactFirstName), [contactFirstName]);

  const suggestedCategories = getCategoriesByKeys(discoveryCategories);
  const suggestedProducts = suggestedCategories
    .map(c => getProductById(c.productId))
    .filter(Boolean) as Product[];
  const suggestedProductIds = new Set(suggestedProducts.map(p => p.id));
  const [showAllProducts, setShowAllProducts] = useState(false);

  const handleAddressChange = (field: keyof SampleAddress, value: string) => {
    onSetSampleAddress({ ...address, [field]: value });
  };

  const otherProducts = allProducts.filter((p) => !suggestedProductIds.has(p.id));

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

          <div className="space-y-2">
            <Label>Which products to send?</Label>

            {/* Suggested product cards */}
            {suggestedProducts.map((sp) => (
              <button
                key={sp.id}
                type="button"
                onClick={() => onToggleSampleProduct(sp.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                  sampleProducts.includes(sp.id)
                    ? "ring-2 ring-primary border-primary bg-primary/5"
                    : "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 hover:border-primary/50"
                }`}
              >
                <div className="relative size-10 flex-shrink-0 rounded-full overflow-hidden bg-muted">
                  <Image
                    src={sp.image}
                    alt={sp.name}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold block">{sp.name}</span>
                  <Badge variant="secondary" className="mt-1 text-xs gap-1">
                    <Sparkles className="size-3" />
                    Recommended based on their needs
                  </Badge>
                </div>
                {sampleProducts.includes(sp.id) && (
                  <Check className="size-4 text-primary shrink-0" />
                )}
              </button>
            ))}

            {/* Collapsible for other products */}
            {suggestedProducts.length > 0 ? (
              <Collapsible open={showAllProducts} onOpenChange={setShowAllProducts}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    <ChevronDown
                      className={`size-4 transition-transform ${showAllProducts ? "rotate-180" : ""}`}
                    />
                    Add more products
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {otherProducts.map((product) => {
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
                </CollapsibleContent>
              </Collapsible>
            ) : (
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
            )}

            {sampleProducts.length > 0 && (
              <div className="space-y-2 border-t pt-3 mt-2">
                <p className="text-xs font-medium text-muted-foreground">Quantity per product</p>
                {sampleProducts.map((pid) => {
                  const p = getProductById(pid);
                  if (!p) return null;
                  const qty = sampleQuantities[pid] ?? 1;
                  return (
                    <div key={pid} className="flex items-center justify-between gap-2">
                      <span className="text-sm truncate">{p.name}</span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-7"
                          disabled={qty <= 1}
                          onClick={() => onSetSampleQuantity(pid, Math.max(1, qty - 1))}
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-6 text-center text-sm font-medium tabular-nums">{qty}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-7"
                          onClick={() => onSetSampleQuantity(pid, qty + 1)}
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
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
                autoComplete="street-address"
                value={address.line1}
                onChange={(e) => handleAddressChange("line1", e.target.value)}
                placeholder="123 Main St"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addr-line2">Apt / Suite / Unit</Label>
              <Input
                id="addr-line2"
                autoComplete="address-line2"
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
                  autoComplete="address-level2"
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
                    autoComplete="address-level1"
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
                    autoComplete="postal-code"
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
                  autoComplete="address-level2"
                  value={address.city}
                  onChange={(e) => handleAddressChange("city", e.target.value)}
                  placeholder="City"
                />
              </div>
              <div className="col-span-1 space-y-2">
                <Label htmlFor="addr-state">State *</Label>
                <Input
                  id="addr-state"
                  autoComplete="address-level1"
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
                  autoComplete="postal-code"
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
        {continueLabel}
        <ChevronRight className="size-4 ml-1" />
      </Button>
    </div>
  );
}
