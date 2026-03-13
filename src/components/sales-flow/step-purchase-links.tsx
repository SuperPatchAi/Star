"use client";

import { useState, useCallback, useMemo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, ExternalLink, AlertCircle } from "lucide-react";
import { ShareCopyButton } from "@/components/ui/share-copy-button";
import { getProductPurchaseUrl } from "@/lib/utils";
import { updateStoreSubdomain } from "@/lib/actions/profile";
import type { Product } from "@/types";

interface StepPurchaseLinksProps {
  product: Product;
  storeSubdomain: string | null;
  contactFirstName?: string;
  allProducts: Product[];
  onContinue: () => void;
  onSubdomainSaved: (subdomain: string) => void;
}

function buildSingleProductScript(
  firstName: string | undefined,
  productName: string,
  url: string,
): string {
  const name = firstName || "[Name]";
  return `Hey ${name}, great chatting about ${productName}! Here's where you can grab yours:\n\n${url}\n\nIt's 100% drug-free and all-natural. Let me know if you have any questions!`;
}

function buildMultiProductScript(
  firstName: string | undefined,
  products: { name: string; url: string }[],
): string {
  const name = firstName || "[Name]";
  const links = products.map((p) => `• ${p.name}: ${p.url}`).join("\n");
  return `Hey ${name}, thanks for taking the time today! Here are the links to everything we talked about:\n\n${links}\n\nLet me know which one you'd like to start with, or grab them all!`;
}

export function StepPurchaseLinks({
  product,
  storeSubdomain,
  contactFirstName,
  allProducts,
  onContinue,
  onSubdomainSaved,
}: StepPurchaseLinksProps) {
  const [localSubdomain, setLocalSubdomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveSubdomain = useCallback(async () => {
    const cleaned = localSubdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!cleaned) return;
    setSaving(true);
    setSaveError(null);
    const { error } = await updateStoreSubdomain(cleaned);
    setSaving(false);
    if (error) {
      setSaveError(error);
    } else {
      onSubdomainSaved(cleaned);
    }
  }, [localSubdomain, onSubdomainSaved]);

  const productUrl = useMemo(
    () => (storeSubdomain ? getProductPurchaseUrl(storeSubdomain, product.id) : null),
    [storeSubdomain, product.id],
  );

  const singleScript = useMemo(
    () => (productUrl ? buildSingleProductScript(contactFirstName, product.name, productUrl) : ""),
    [productUrl, contactFirstName, product.name],
  );

  const allProductLinks = useMemo(
    () =>
      storeSubdomain
        ? allProducts.map((p) => ({
            name: p.name,
            url: getProductPurchaseUrl(storeSubdomain, p.id),
          }))
        : [],
    [storeSubdomain, allProducts],
  );

  const multiScript = useMemo(
    () =>
      allProductLinks.length > 1
        ? buildMultiProductScript(contactFirstName, allProductLinks)
        : "",
    [allProductLinks, contactFirstName],
  );

  if (!storeSubdomain) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:bg-amber-950 dark:border-amber-800">
          <AlertCircle className="size-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1 space-y-3">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Set up your store link to share purchase URLs with customers.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center rounded-lg border border-amber-300 bg-white dark:bg-amber-900 dark:border-amber-700 overflow-hidden">
                <Input
                  type="text"
                  placeholder="yourname"
                  value={localSubdomain}
                  onChange={(e) =>
                    setLocalSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                  }
                  disabled={saving}
                  className="flex-1 border-0 text-right pr-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <span className="shrink-0 px-2 text-sm text-muted-foreground">.superpatch.com</span>
              </div>
              <Button
                size="sm"
                onClick={handleSaveSubdomain}
                disabled={!localSubdomain.trim() || saving}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
            {saveError && <p className="text-xs text-red-600">{saveError}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Share your purchase link for {product.name} with the customer.
      </p>

      {/* Product link card */}
      <div className="flex items-center gap-3 rounded-lg border p-3 group">
        <div className="relative size-10 rounded-full overflow-hidden bg-muted shrink-0">
          <Image src={product.image} alt={product.name} fill className="object-cover" sizes="40px" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{product.name}</p>
          <a
            href={productUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1 truncate"
          >
            {productUrl}
            <ExternalLink className="size-3 shrink-0" />
          </a>
        </div>
        <ShareCopyButton
          text={productUrl!}
          title={`${product.name} - Super Patch`}
          className="size-9 min-h-[44px] min-w-[44px] shrink-0"
        />
      </div>

      {/* Single product script */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold">Share Script</h4>
          <ShareCopyButton
            text={singleScript}
            variant="labeled"
            label="Copy Script"
            title={`${product.name} Purchase Link`}
          />
        </div>
        <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap">
          {singleScript}
        </div>
      </div>

      {/* Multi-product script (only when 2+ products) */}
      {allProducts.length > 1 && (
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">Share All Products</h4>
            <ShareCopyButton
              text={multiScript}
              variant="labeled"
              label="Copy All"
              title="Super Patch Purchase Links"
            />
          </div>
          <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap">
            {multiScript}
          </div>
        </div>
      )}

      <Button onClick={onContinue} className="w-full">
        Continue to Follow-Up
        <ChevronRight className="size-4 ml-1" />
      </Button>
    </div>
  );
}
