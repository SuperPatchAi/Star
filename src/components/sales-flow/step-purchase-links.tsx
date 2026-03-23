"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle, XCircle, ChevronDown, FileText } from "lucide-react";
import { ShareCopyButton } from "@/components/ui/share-copy-button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BusinessCardDisplay } from "@/components/card/business-card-display";
import { getProductPurchaseUrl, buildSocialFooter } from "@/lib/utils";
import { updateStoreSubdomain } from "@/lib/actions/profile";
import { updateContactOutcome } from "@/lib/actions/contacts";
import { SOCIAL_PLATFORMS } from "@/lib/db/types";
import type { Product } from "@/types";
import type { SocialLinks } from "@/lib/db/types";

interface StepPurchaseLinksProps {
  product: Product;
  storeSubdomain: string | null;
  contactFirstName?: string;
  allProducts: Product[];
  onSubdomainSaved: (subdomain: string) => void;
  contactId?: string;
  socialLinks?: SocialLinks;
  repName?: string | null;
  repAvatarUrl?: string | null;
}

function buildSingleProductScript(
  firstName: string | undefined,
  productName: string,
  url: string,
  socialFooter: string,
): string {
  const name = firstName || "[Name]";
  return `Hey ${name}, great chatting about ${productName}! Here's where you can grab yours:\n\n${url}\n\nIt's 100% drug-free and all-natural. Let me know if you have any questions!${socialFooter}`;
}

function buildMultiProductScript(
  firstName: string | undefined,
  products: { name: string; url: string }[],
  socialFooter: string,
): string {
  const name = firstName || "[Name]";
  const links = products.map((p) => `• ${p.name}: ${p.url}`).join("\n");
  return `Hey ${name}, thanks for taking the time today! Here are the links to everything we talked about:\n\n${links}\n\nLet me know which one you'd like to start with, or grab them all!${socialFooter}`;
}

export function StepPurchaseLinks({
  product,
  storeSubdomain,
  contactFirstName,
  allProducts,
  onSubdomainSaved,
  contactId,
  socialLinks = {},
  repName,
  repAvatarUrl,
}: StepPurchaseLinksProps) {
  const [localSubdomain, setLocalSubdomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [scriptsOpen, setScriptsOpen] = useState(false);

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

  const socialFooter = useMemo(() => buildSocialFooter(socialLinks), [socialLinks]);

  const singleScript = useMemo(
    () => (productUrl ? buildSingleProductScript(contactFirstName, product.name, productUrl, socialFooter) : ""),
    [productUrl, contactFirstName, product.name, socialFooter],
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
        ? buildMultiProductScript(contactFirstName, allProductLinks, socialFooter)
        : "",
    [allProductLinks, contactFirstName, socialFooter],
  );

  const displayName = repName || "SuperPatch Rep";
  const initials = repName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "SP";

  const socialEntries = useMemo(
    () => SOCIAL_PLATFORMS.filter((p) => socialLinks[p.key]?.trim()),
    [socialLinks],
  );

  const cardShareUrl = useMemo(() => {
    if (!storeSubdomain) return undefined;
    const productIds = allProducts.map((p) => p.id).join(",");
    return `https://star-seven-sigma.vercel.app/card/${storeSubdomain}?products=${productIds}`;
  }, [storeSubdomain, allProducts]);

  const cardShareText = useMemo(() => {
    const name = contactFirstName || "there";
    const productNames = allProducts.map((p) => p.name).join(", ");
    const urlLine = cardShareUrl ? `\n\nTap here to shop: ${cardShareUrl}` : "";
    return `Hey ${name}! Here are my product picks for you: ${productNames}.${urlLine}`;
  }, [contactFirstName, allProducts, cardShareUrl]);

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
                  autoComplete="url"
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
        Share your branded card with {contactFirstName || "the customer"}.
      </p>

      {/* Branded product business card */}
      <div className="flex justify-center">
        <BusinessCardDisplay
          displayName={displayName}
          initials={initials}
          avatarUrl={repAvatarUrl ?? null}
          storeUrl={`https://${storeSubdomain}.superpatch.com`}
          socialEntries={socialEntries}
          socialLinks={socialLinks}
          products={allProducts}
          storeSubdomain={storeSubdomain}
          contactFirstName={contactFirstName}
          shareUrl={cardShareUrl}
          shareText={cardShareText}
        />
      </div>

      {/* Collapsible text scripts */}
      <Collapsible open={scriptsOpen} onOpenChange={setScriptsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between text-muted-foreground">
            <span className="flex items-center gap-2">
              <FileText className="size-4" />
              Copy as Text
            </span>
            <ChevronDown className={`size-4 transition-transform ${scriptsOpen ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
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
        </CollapsibleContent>
      </Collapsible>

      {/* Outcome actions */}
      {contactId && (
        <div className="rounded-lg border border-border/50 bg-primary/5 p-4">
          {outcome ? (
            <div className="flex items-center gap-2 text-sm font-medium">
              {outcome === "won" ? (
                <CheckCircle className="size-5 text-green-500" />
              ) : (
                <XCircle className="size-5 text-red-500" />
              )}
              Marked as {outcome === "won" ? "Won" : "Lost"}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">How did it go?</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Mark the outcome of this sales conversation
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-10 border-green-300 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
                  onClick={async () => {
                    setOutcome("won");
                    if (contactId) await updateContactOutcome(contactId, "won");
                  }}
                >
                  <CheckCircle className="size-4 mr-1.5" />
                  Won
                </Button>
                <Button
                  variant="outline"
                  className="h-10 border-red-300 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                  onClick={async () => {
                    setOutcome("lost");
                    if (contactId) await updateContactOutcome(contactId, "lost");
                  }}
                >
                  <XCircle className="size-4 mr-1.5" />
                  Lost
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
