"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  CheckCircle,
  XCircle,
  Circle,
  ArrowUpRight,
  Users,
  MessageSquarePlus,
  SlidersHorizontal,
  MapPin,
  CalendarPlus,
} from "lucide-react";
import { products } from "@/data/products";
import type { Contact, ContactStep } from "@/lib/db/types";
import { STALENESS_THRESHOLDS } from "@/types/reminders";
import { SALES_STEPS } from "@/types/roadmap";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ContactsTableProps {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
  onStartNew?: () => void;
  initialStageFilter?: string | null;
}

const stepLabels: Record<string, string> = Object.fromEntries([
  ...SALES_STEPS.map(s => [s.id, s.label]),
  ["closed", "Closed"],
]);

function OutcomeIcon({ outcome }: { outcome: string }) {
  switch (outcome) {
    case "won":
      return <CheckCircle className="size-5 text-success" />;
    case "lost":
      return <XCircle className="size-5 text-destructive" />;
    case "follow_up":
      return <ArrowUpRight className="size-5 text-primary" />;
    default:
      return <Circle className="size-5 text-muted-foreground/40" />;
  }
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function getStaleDays(contact: Contact): number {
  if (!contact.stage_entered_at) return 0;
  return Math.floor((Date.now() - new Date(contact.stage_entered_at).getTime()) / 86400000);
}

function isStale(contact: Contact): boolean {
  const threshold = STALENESS_THRESHOLDS[contact.current_step as ContactStep] ?? Infinity;
  if (threshold === Infinity || threshold === 0) return false;
  return getStaleDays(contact) >= threshold;
}

function getContextLine(contact: Contact): { text: string; accent?: string } {
  const contactProducts = products.filter((p) => contact.product_ids.includes(p.id));
  const productNames = contactProducts.map((p) => p.name).join(", ") || "No product";
  const step = stepLabels[contact.current_step] || contact.current_step;

  if (contact.outcome === "won") {
    return { text: `${productNames} · Won`, accent: "text-success" };
  }
  if (contact.outcome === "lost") {
    return { text: `${productNames} · Lost`, accent: "text-destructive" };
  }

  if (contact.current_step === "followup") {
    const day = (contact.follow_up_day ?? 0) + 1;
    const stale = isStale(contact);
    const label = `${productNames} · Follow-Up Day ${day}`;
    if (stale) return { text: `${label} · overdue`, accent: "text-destructive" };
    return { text: label };
  }

  const staleDays = getStaleDays(contact);
  const stale = isStale(contact);

  if (stale) {
    return { text: `${productNames} · ${step} · ${staleDays}d (stale)`, accent: "text-warning" };
  }

  const timeAgo = getTimeAgo(contact.updated_at);
  return { text: `${productNames} · ${step} · ${timeAgo}` };
}

type DateRangeKey = "all" | "today" | "this_week" | "this_month" | "this_quarter";

const DATE_RANGE_FILTERS: { value: DateRangeKey; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "this_quarter", label: "Last 90 Days" },
];

function getDateRangeStart(range: DateRangeKey): Date | null {
  if (range === "all") return null;
  const now = new Date();
  switch (range) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "this_week": {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      d.setDate(d.getDate() - d.getDay());
      return d;
    }
    case "this_month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "this_quarter": {
      const d = new Date(now);
      d.setDate(d.getDate() - 90);
      return d;
    }
  }
}

type FilterKey = "all" | "pending" | "won" | "lost" | "follow_up" | "samples";

const STAGE_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All Stages" },
  ...SALES_STEPS.filter(s => s.id !== "add_contact").map(s => ({ value: s.id, label: s.label })),
  { value: "closed", label: "Closed" },
];

export function ContactsTable({
  contacts,
  onEdit,
  onStartNew,
  initialStageFilter,
}: ContactsTableProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [filterProduct, setFilterProduct] = useState<string>("all");
  const [filterStage, setFilterStage] = useState<string>(initialStageFilter || "all");
  const [filterDateRange, setFilterDateRange] = useState<DateRangeKey>("all");

  const dateRangeStart = getDateRangeStart(filterDateRange);

  const filtered = contacts.filter((c) => {
    if (filterProduct !== "all" && !c.product_ids.includes(filterProduct))
      return false;
    if (filterStage !== "all" && c.current_step !== filterStage) return false;
    if (dateRangeStart && new Date(c.created_at) < dateRangeStart) return false;
    if (activeFilter === "pending" && c.outcome !== "pending") return false;
    if (activeFilter === "won" && c.outcome !== "won") return false;
    if (activeFilter === "lost" && c.outcome !== "lost") return false;
    if (activeFilter === "follow_up" && c.outcome !== "follow_up") return false;
    if (activeFilter === "samples" && !c.sample_sent) return false;
    return true;
  });

  const getFirstProduct = (productIds: string[]) =>
    products.find((p) => productIds.includes(p.id));

  const counts = {
    all: contacts.length,
    pending: contacts.filter((c) => c.outcome === "pending").length,
    won: contacts.filter((c) => c.outcome === "won").length,
    lost: contacts.filter((c) => c.outcome === "lost").length,
    follow_up: contacts.filter((c) => c.outcome === "follow_up").length,
    samples: contacts.filter((c) => c.sample_sent).length,
  };

  const pills: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Open" },
    { key: "won", label: "Won" },
    { key: "lost", label: "Lost" },
    { key: "follow_up", label: "Follow Up" },
    { key: "samples", label: "Samples" },
  ];

  return (
    <div className="space-y-3">
      {/* Filter pills + product filter */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1 pb-1">
          {pills.map((pill) => (
            <button
              key={pill.key}
              onClick={() => setActiveFilter(pill.key)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                activeFilter === pill.key
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {pill.label}
              {counts[pill.key] > 0 && (
                <span
                  className={cn(
                    "text-[10px] tabular-nums",
                    activeFilter === pill.key
                      ? "text-background/70"
                      : "text-muted-foreground/60"
                  )}
                >
                  {counts[pill.key]}
                </span>
              )}
            </button>
          ))}
        </div>
        <Select value={filterStage} onValueChange={setFilterStage}>
          <SelectTrigger className={cn(
            "h-8 w-auto min-w-[120px] text-xs shrink-0",
            filterStage !== "all" && "border-primary text-primary"
          )}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STAGE_FILTERS.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterDateRange} onValueChange={(v) => setFilterDateRange(v as DateRangeKey)}>
          <SelectTrigger className={cn(
            "h-8 w-auto min-w-[100px] text-xs shrink-0",
            filterDateRange !== "all" && "border-primary text-primary"
          )}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGE_FILTERS.map((d) => (
              <SelectItem key={d.value} value={d.value} className="text-xs">
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "size-9 shrink-0",
                filterProduct !== "all" && "text-primary"
              )}
            >
              <SlidersHorizontal className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48 p-2">
            <p className="text-xs font-medium text-muted-foreground px-2 pb-1.5">
              Product
            </p>
            <button
              onClick={() => setFilterProduct("all")}
              className={cn(
                "w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors",
                filterProduct === "all"
                  ? "bg-muted font-medium"
                  : "hover:bg-muted/60"
              )}
            >
              All Products
            </button>
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => setFilterProduct(p.id)}
                className={cn(
                  "w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors",
                  filterProduct === p.id
                    ? "bg-muted font-medium"
                    : "hover:bg-muted/60"
                )}
              >
                {p.name}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      {/* Contact rows */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Users className="size-12 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="font-semibold text-base mb-1">No contacts yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Start a sales conversation to add your first contact.
          </p>
          <Button onClick={onStartNew}>
            <MessageSquarePlus className="size-4 mr-1.5" />
            Start Conversation
          </Button>
        </div>
      ) : (
        <div>
          {filtered.map((contact) => {
            const firstProduct = getFirstProduct(contact.product_ids);
            const context = getContextLine(contact);
            const fullName = `${contact.first_name} ${contact.last_name}`;

            return (
              <div
                key={contact.id}
                className="flat-list-row flex items-center gap-3 cursor-pointer active:bg-muted/50 transition-colors"
                onClick={() => onEdit(contact)}
              >
                {/* Single small product avatar */}
                {firstProduct ? (
                  <div className="relative size-8 rounded-full overflow-hidden bg-muted shrink-0 ring-1 ring-border">
                    <Image
                      src={firstProduct.image}
                      alt={firstProduct.name}
                      fill
                      className="object-cover"
                      sizes="32px"
                    />
                  </div>
                ) : (
                  <div className="size-8 rounded-full bg-muted shrink-0 ring-1 ring-border flex items-center justify-center text-xs font-medium text-muted-foreground">
                    {contact.first_name[0]}
                  </div>
                )}

                {/* Two-line content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold truncate">
                      {fullName}
                    </span>
                    {contact.sample_sent && (
                      <span
                        className="size-1.5 rounded-full bg-success shrink-0"
                        title="Sample sent"
                      />
                    )}
                  </div>
                  <p className={cn("text-xs truncate", context.accent || "text-muted-foreground")}>
                    {context.text}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {contact.address_line1 && (
                      <p className="text-xs text-muted-foreground/70 truncate flex items-center gap-1">
                        <MapPin className="size-2.5 shrink-0" />
                        {[contact.address_line1, contact.address_city, contact.address_state, contact.address_zip].filter(Boolean).join(", ")}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/50 flex items-center gap-1 shrink-0">
                      <CalendarPlus className="size-2.5" />
                      {formatShortDate(contact.created_at)}
                    </p>
                  </div>
                </div>

                {/* Outcome icon */}
                <div className="shrink-0">
                  <OutcomeIcon outcome={contact.outcome} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
