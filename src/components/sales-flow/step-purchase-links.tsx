"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronDown,
  FileText,
  ShoppingCart,
  Loader2,
  LinkIcon,
  Package,
} from "lucide-react";
import { ShareCopyButton } from "@/components/ui/share-copy-button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BusinessCardDisplay } from "@/components/card/business-card-display";
import { getProductPurchaseUrl } from "@/lib/utils";
import { updateStoreSubdomain } from "@/lib/actions/profile";
import { updateContactOutcome } from "@/lib/actions/contacts";
import {
  reconcileContact,
  confirmMatch,
  getContactPurchaseMatches,
} from "@/lib/actions/reconcile";
import type { Product } from "@/types";
import type { PurchaseMatch, MatchConfidence } from "@/lib/db/types";
import type { ByDesignCustomer } from "@/lib/actions/bydesign";

interface StepPurchaseLinksProps {
  product: Product;
  storeSubdomain: string | null;
  contactFirstName?: string;
  allProducts: Product[];
  onSubdomainSaved: (subdomain: string) => void;
  contactId?: string;
  repName?: string | null;
  repAvatarUrl?: string | null;
  bydesignCustomerDid?: string | null;
  bydesignMatchConfidence?: string | null;
  bydesignOrderCount?: number;
  bydesignTotalSpent?: number;
}

const CONFIDENCE_STYLES: Record<
  MatchConfidence,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className: string }
> = {
  email: { label: "Email Match", variant: "default", className: "bg-green-600 hover:bg-green-700" },
  phone: { label: "Phone Match", variant: "default", className: "bg-blue-600 hover:bg-blue-700" },
  name: { label: "Name Match", variant: "default", className: "bg-amber-500 hover:bg-amber-600 text-white" },
  manual: { label: "Manual Match", variant: "secondary", className: "" },
};

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const style = CONFIDENCE_STYLES[confidence as MatchConfidence] ?? {
    label: confidence,
    variant: "secondary" as const,
    className: "",
  };
  return (
    <Badge variant={style.variant} className={style.className}>
      {style.label}
    </Badge>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const ORDER_STATUS_MAP: Record<number, { label: string; color: string }> = {
  1: { label: "Pending", color: "text-amber-600" },
  2: { label: "Processing", color: "text-blue-600" },
  3: { label: "Shipped", color: "text-indigo-600" },
  4: { label: "Delivered", color: "text-green-600" },
  5: { label: "Cancelled", color: "text-red-600" },
};

function PurchaseReconciliationSection({
  contactId,
  bydesignCustomerDid,
  bydesignMatchConfidence,
  bydesignOrderCount = 0,
  bydesignTotalSpent = 0,
}: {
  contactId: string;
  bydesignCustomerDid?: string | null;
  bydesignMatchConfidence?: string | null;
  bydesignOrderCount?: number;
  bydesignTotalSpent?: number;
}) {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<PurchaseMatch[]>([]);
  const [matchesLoaded, setMatchesLoaded] = useState(false);
  const [isLinked, setIsLinked] = useState(!!bydesignCustomerDid);
  const [confidence, setConfidence] = useState<string | null>(
    bydesignMatchConfidence ?? null
  );
  const [orderCount, setOrderCount] = useState(bydesignOrderCount);
  const [totalSpent, setTotalSpent] = useState(bydesignTotalSpent);
  const [pendingCustomer, setPendingCustomer] =
    useState<ByDesignCustomer | null>(null);
  const [reconcileOpen, setReconcileOpen] = useState(!!bydesignCustomerDid);

  useEffect(() => {
    if (!isLinked || matchesLoaded) return;
    let cancelled = false;
    getContactPurchaseMatches(contactId).then(({ data }) => {
      if (!cancelled) {
        setMatches(data);
        setMatchesLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isLinked, contactId, matchesLoaded]);

  const handleReconcile = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await reconcileContact(contactId);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.matched) {
      setIsLinked(true);
      setConfidence(result.confidence);
      setOrderCount(result.orders_found);
      if (result.orders_found > 0) {
        const { data } = await getContactPurchaseMatches(contactId);
        setMatches(data);
        setMatchesLoaded(true);
        const spent = data.reduce(
          (sum, m) => sum + (m.order_total ?? 0),
          0
        );
        setTotalSpent(spent);
      }
      return;
    }

    if (result.confidence === "name" && result.customer) {
      setPendingCustomer(result.customer);
      setConfidence("name");
      return;
    }

    setError("No matching ByDesign customer found for this contact.");
  }, [contactId]);

  const handleConfirm = useCallback(async () => {
    if (!pendingCustomer) return;
    setConfirming(true);
    setError(null);
    const result = await confirmMatch(
      contactId,
      String(pendingCustomer.CustomerDID)
    );
    setConfirming(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setIsLinked(true);
    setConfidence("manual");
    setPendingCustomer(null);
    setOrderCount(result.orders_found);
    if (result.orders_found > 0) {
      const { data } = await getContactPurchaseMatches(contactId);
      setMatches(data);
      setMatchesLoaded(true);
      const spent = data.reduce(
        (sum, m) => sum + (m.order_total ?? 0),
        0
      );
      setTotalSpent(spent);
    }
  }, [contactId, pendingCustomer]);

  const handleReject = useCallback(() => {
    setPendingCustomer(null);
    setConfidence(null);
  }, []);

  return (
    <Collapsible open={reconcileOpen} onOpenChange={setReconcileOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between text-muted-foreground"
        >
          <span className="flex items-center gap-2">
            <ShoppingCart className="size-4" />
            Purchase Verification
            {isLinked && confidence && (
              <ConfidenceBadge confidence={confidence} />
            )}
          </span>
          <ChevronDown
            className={`size-4 transition-transform ${reconcileOpen ? "rotate-180" : ""}`}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-2">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:bg-red-950 dark:border-red-800">
            <AlertCircle className="size-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Pending name-match confirm */}
        {pendingCustomer && !isLinked && (
          <Card className="border-amber-200 dark:border-amber-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <LinkIcon className="size-4 text-amber-600" />
                Possible Match Found
                <ConfidenceBadge confidence="name" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Name:</span>{" "}
                  {pendingCustomer.FirstName} {pendingCustomer.LastName}
                </p>
                {pendingCustomer.EmailAddress && (
                  <p>
                    <span className="text-muted-foreground">Email:</span>{" "}
                    {pendingCustomer.EmailAddress}
                  </p>
                )}
                {pendingCustomer.Phone && (
                  <p>
                    <span className="text-muted-foreground">Phone:</span>{" "}
                    {pendingCustomer.Phone}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleConfirm}
                  disabled={confirming}
                >
                  {confirming ? (
                    <Loader2 className="size-4 mr-1.5 animate-spin" />
                  ) : (
                    <CheckCircle className="size-4 mr-1.5" />
                  )}
                  Confirm Match
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReject}
                  disabled={confirming}
                >
                  <XCircle className="size-4 mr-1.5" />
                  Not a Match
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Not yet matched */}
        {!isLinked && !pendingCustomer && (
          <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/50 p-4">
            <div>
              <p className="text-sm font-medium">
                Verify purchases in ByDesign
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Match this contact to their ByDesign customer record
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleReconcile}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              ) : (
                <LinkIcon className="size-4 mr-1.5" />
              )}
              {loading ? "Matching…" : "Match Purchases"}
            </Button>
          </div>
        )}

        {/* Linked summary + orders */}
        {isLinked && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 p-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="size-4 text-green-600" />
                <span className="font-medium text-green-800 dark:text-green-200">
                  Linked to ByDesign
                </span>
                {confidence && (
                  <ConfidenceBadge confidence={confidence} />
                )}
              </div>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>
                  {orderCount} order{orderCount !== 1 ? "s" : ""}
                </span>
                <span className="font-medium text-foreground">
                  {formatCurrency(totalSpent)}
                </span>
              </div>
            </div>

            {matches.length > 0 && (
              <div className="space-y-2">
                {matches.map((match) => {
                  const status = match.order_status_id
                    ? ORDER_STATUS_MAP[match.order_status_id]
                    : null;
                  return (
                    <Card key={match.id} className="border-border/50">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium">
                                Order #{match.bydesign_order_id}
                              </span>
                              {status && (
                                <span
                                  className={`text-xs ${status.color}`}
                                >
                                  {status.label}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(match.order_date)}
                            </p>
                          </div>
                          <span className="text-sm font-semibold">
                            {match.order_total != null
                              ? formatCurrency(match.order_total)
                              : "—"}
                          </span>
                        </div>
                        {match.products_purchased.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {match.products_purchased.map((p, i) => (
                              <Badge
                                key={`${match.id}-${i}`}
                                variant="outline"
                                className="text-xs gap-1"
                              >
                                <Package className="size-3" />
                                {p.name}
                                {p.quantity > 1 && ` ×${p.quantity}`}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
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
  onSubdomainSaved,
  contactId,
  repName,
  repAvatarUrl,
  bydesignCustomerDid,
  bydesignMatchConfidence,
  bydesignOrderCount,
  bydesignTotalSpent,
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

  const displayName = repName || "SuperPatch Rep";
  const initials = repName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "SP";

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

      {/* Purchase reconciliation */}
      {contactId && (
        <PurchaseReconciliationSection
          contactId={contactId}
          bydesignCustomerDid={bydesignCustomerDid}
          bydesignMatchConfidence={bydesignMatchConfidence}
          bydesignOrderCount={bydesignOrderCount}
          bydesignTotalSpent={bydesignTotalSpent}
        />
      )}
    </div>
  );
}
