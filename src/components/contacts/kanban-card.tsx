"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Phone,
  Mail,
  Play,
  CheckCircle,
  XCircle,
  Circle,
  ArrowUpRight,
  ChevronRight,
  ChevronLeft,
  Trophy,
  ThumbsDown,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { products } from "@/data/products";
import type { Contact, ContactOutcome, ContactStep } from "@/lib/db/types";
import { SALES_STEPS } from "@/types/roadmap";
import { STALENESS_THRESHOLDS } from "@/types/reminders";
import { cn } from "@/lib/utils";

const ALL_STEPS = [...SALES_STEPS.map((s) => s.id), "closed" as const];

function OutcomeIndicator({ outcome }: { outcome: string }) {
  switch (outcome) {
    case "won":
      return <CheckCircle className="size-3.5 text-success" />;
    case "lost":
      return <XCircle className="size-3.5 text-destructive" />;
    case "follow_up":
      return <ArrowUpRight className="size-3.5 text-primary" />;
    default:
      return <Circle className="size-3.5 text-muted-foreground/30" />;
  }
}

interface KanbanCardProps {
  contact: Contact;
  onEdit: (contact: Contact) => void;
  onStageChange?: (contactId: string, newStep: string) => void;
  onOutcomeChange?: (contactId: string, outcome: ContactOutcome) => void;
  isDragging?: boolean;
  dragRef?: (element: Element | null) => void;
  handleRef?: (element: Element | null) => void;
}

function getStaleDays(contact: Contact): number {
  if (!contact.stage_entered_at) return 0;
  const entered = new Date(contact.stage_entered_at).getTime();
  const now = Date.now();
  return Math.floor((now - entered) / (1000 * 60 * 60 * 24));
}

function isStale(contact: Contact): boolean {
  const threshold =
    STALENESS_THRESHOLDS[contact.current_step as ContactStep] ?? Infinity;
  if (threshold === Infinity || threshold === 0) return false;
  return getStaleDays(contact) >= threshold;
}

function isRecentlyAdvanced(contact: Contact): boolean {
  if (!contact.stage_entered_at) return false;
  const entered = new Date(contact.stage_entered_at).getTime();
  const hoursSince = (Date.now() - entered) / (1000 * 60 * 60);
  return hoursSince <= 24;
}

function hasRegressed(contact: Contact): boolean {
  if (!contact.peak_step) return false;
  const currentIdx = ALL_STEPS.indexOf(contact.current_step || "add_contact");
  const peakIdx = ALL_STEPS.indexOf(contact.peak_step as typeof ALL_STEPS[number]);
  return peakIdx > currentIdx;
}

export function KanbanCard({
  contact,
  onEdit,
  onStageChange,
  onOutcomeChange,
  isDragging = false,
  dragRef,
}: KanbanCardProps) {
  const contactProducts = products.filter((p) =>
    contact.product_ids.includes(p.id)
  );

  const currentStepIdx = ALL_STEPS.indexOf(
    contact.current_step || "add_contact"
  );
  const canGoBack = currentStepIdx > 0;
  const canGoForward = currentStepIdx < ALL_STEPS.length - 1;
  const showWonLost = contact.current_step === "purchase_links";
  const stale = isStale(contact);
  const staleDays = getStaleDays(contact);
  const recentlyAdvanced = !stale && isRecentlyAdvanced(contact);
  const regressed = hasRegressed(contact);

  const handleAdvance = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canGoForward && onStageChange) {
      onStageChange(contact.id, ALL_STEPS[currentStepIdx + 1]);
    }
  };

  const handleGoBack = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canGoBack && onStageChange) {
      onStageChange(contact.id, ALL_STEPS[currentStepIdx - 1]);
    }
  };

  const setRef = (el: HTMLDivElement | null) => {
    if (dragRef) dragRef(el);
  };

  return (
    <Card
      ref={setRef}
      className={cn(
        "cursor-pointer border-border/50 transition-shadow",
        isDragging
          ? "opacity-50 shadow-lg ring-2 ring-primary/30"
          : "hover:shadow-sm",
        stale && "ring-1 ring-warning/60"
      )}
      onClick={() => onEdit(contact)}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          {contactProducts.length > 0 && (
            <div className="flex -space-x-1.5 shrink-0">
              {contactProducts.slice(0, 2).map((p) => (
                <div
                  key={p.id}
                  className="relative size-8 rounded-full overflow-hidden bg-muted ring-2 ring-background"
                  title={p.name}
                >
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    className="object-cover"
                    sizes="32px"
                  />
                </div>
              ))}
              {contactProducts.length > 2 && (
                <div className="flex size-8 items-center justify-center rounded-full bg-muted ring-2 ring-background text-[10px] font-medium">
                  +{contactProducts.length - 2}
                </div>
              )}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm truncate">
                {contact.first_name} {contact.last_name}
              </span>
              <OutcomeIndicator outcome={contact.outcome} />
              {contact.sample_sent && (
                <span
                  className="size-2 rounded-full bg-success shrink-0"
                  title="Sample sent"
                />
              )}
              {stale && (
                <span
                  className="flex items-center gap-0.5 text-[9px] text-warning"
                  title={`${staleDays}d in this stage`}
                >
                  <AlertCircle className="size-2.5" />
                  {staleDays}d
                </span>
              )}
              {recentlyAdvanced && (
                <span
                  className="flex items-center gap-0.5 text-[9px] text-green-600 dark:text-green-400"
                  title="Recently advanced"
                >
                  <TrendingUp className="size-2.5" />
                </span>
              )}
              {regressed && (
                <span
                  className="flex items-center gap-0.5 text-[9px] text-destructive"
                  title="Moved backward from peak"
                >
                  <TrendingDown className="size-2.5" />
                </span>
              )}
            </div>
            {contactProducts.length > 0 && (
              <p className="text-[11px] text-muted-foreground truncate">
                {contactProducts.map((p) => p.name).join(", ")}
              </p>
            )}
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground/70">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-0.5 truncate hover:text-foreground transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Mail className="size-2.5" />
                  {contact.email}
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-0.5 hover:text-foreground transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="size-2.5" />
                  {contact.phone}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="mt-2 flex items-center justify-between gap-1">
          <div className="flex items-center gap-0.5">
            {canGoBack && onStageChange && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={handleGoBack}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
            )}
            {canGoForward && onStageChange && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={handleAdvance}
              >
                <ChevronRight className="size-3.5" />
              </Button>
            )}
            {contact.phone && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                asChild
                onClick={(e) => e.stopPropagation()}
              >
                <a href={`tel:${contact.phone}`}>
                  <Phone className="size-3.5" />
                </a>
              </Button>
            )}
            {contact.email && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                asChild
                onClick={(e) => e.stopPropagation()}
              >
                <a href={`mailto:${contact.email}`}>
                  <Mail className="size-3.5" />
                </a>
              </Button>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {showWonLost &&
              onOutcomeChange &&
              contact.outcome !== "won" &&
              contact.outcome !== "lost" && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[10px] text-success hover:bg-success/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOutcomeChange(contact.id, "won");
                    }}
                  >
                    <Trophy className="size-3 mr-0.5" />
                    Won
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[10px] text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOutcomeChange(contact.id, "lost");
                    }}
                  >
                    <ThumbsDown className="size-3 mr-0.5" />
                    Lost
                  </Button>
                </>
              )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(contact);
              }}
            >
              <Play className="size-3 mr-0.5" />
              Resume
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
