"use client";

import { useState } from "react";
import Link from "next/link";
import { Phone, Mail, Clock, AlertCircle, Video, Play, TimerReset, MessageSquare, Square, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareCopyButton } from "@/components/ui/share-copy-button";
import { cn } from "@/lib/utils";
import { interpolateScript } from "@/lib/interpolate-script";
import { advanceFollowUpDay, dismissReminder } from "@/lib/actions/contacts";
import type { FollowUpReminder } from "@/types/reminders";

interface FeedEntryProps {
  reminder: FollowUpReminder;
  onAction?: () => void;
}

const channelToIcon: Record<string, React.ElementType> = {
  Call: Phone,
  "Call/Text": Phone,
  "Text/Call": Phone,
  Text: MessageSquare,
  Email: Mail,
  "Zoom Call": Video,
};

export function FeedEntry({ reminder, onAction }: FeedEntryProps) {
  const [expanded, setExpanded] = useState(false);
  const [acting, setActing] = useState(false);

  const { contact, type, urgency, stageName, daysSinceEntry, followUpStep } = reminder;
  const fullName = `${contact.first_name} ${contact.last_name}`;
  const productNames = contact.product_ids.join(", ");

  const contextLine =
    type === "followup_due" && followUpStep
      ? `${followUpStep.day} ${followUpStep.action.toLowerCase()} due`
      : `In ${stageName} for ${daysSinceEntry} day${daysSinceEntry !== 1 ? "s" : ""}`;

  const TypeIcon =
    type === "followup_due" && followUpStep
      ? channelToIcon[followUpStep.channel] || Clock
      : type === "stale"
        ? AlertCircle
        : Clock;

  const handleMarkDone = async () => {
    setActing(true);
    try {
      if (type === "followup_due") {
        await advanceFollowUpDay(contact.id);
      } else {
        await dismissReminder(contact.id);
      }
      onAction?.();
    } finally {
      setActing(false);
    }
  };

  const handleSnooze = async () => {
    setActing(true);
    try {
      await dismissReminder(contact.id);
      onAction?.();
    } finally {
      setActing(false);
    }
  };

  return (
    <div
      className="px-3 py-3 cursor-pointer group"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div className="shrink-0 mt-0.5">
          <TypeIcon className={cn(
            "size-5",
            urgency === "overdue" ? "text-destructive" : "text-muted-foreground"
          )} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{fullName}</p>
              <p className="text-xs text-muted-foreground truncate">{productNames}</p>
            </div>
            {followUpStep && (
              <span className={cn(
                "text-xs font-medium shrink-0",
                urgency === "overdue" ? "text-destructive" : "text-muted-foreground"
              )}>
                {followUpStep.day}
              </span>
            )}
          </div>

          {/* Context line with overdue dates in red */}
          <p className={cn(
            "text-xs mt-0.5",
            urgency === "overdue" ? "text-destructive" : "text-muted-foreground"
          )}>
            {contextLine}
          </p>

          {/* Quick actions */}
          <div className="flex items-center gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
            {contact.phone && (
              <Button variant="ghost" size="icon" className="size-9 min-h-[44px] min-w-[44px]" asChild>
                <a href={`tel:${contact.phone}`} aria-label="Call">
                  <Phone className="size-4" />
                </a>
              </Button>
            )}
            {contact.email && (
              <Button variant="ghost" size="icon" className="size-9 min-h-[44px] min-w-[44px]" asChild>
                <a href={`mailto:${contact.email}`} aria-label="Email">
                  <Mail className="size-4" />
                </a>
              </Button>
            )}

            {type === "followup_due" && followUpStep && (
              <ShareCopyButton text={interpolateScript(followUpStep.template, contact.first_name)} variant="labeled" label="Script" />
            )}

            <div className="flex-1" />

            <button
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => { e.stopPropagation(); handleMarkDone(); }}
              disabled={acting}
              aria-label="Mark done"
            >
              {acting ? (
                <CheckSquare className="size-5 text-green-500 animate-pulse" />
              ) : (
                <Square className="size-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-3 ml-8 space-y-3 border-t pt-3" onClick={(e) => e.stopPropagation()}>
          {type === "followup_due" && followUpStep ? (
            <>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  {channelToIcon[followUpStep.channel] ? (
                    (() => {
                      const Icon = channelToIcon[followUpStep.channel];
                      return <Icon className="size-3.5" />;
                    })()
                  ) : null}
                  {followUpStep.channel}
                </span>
                <span className="text-xs text-muted-foreground/70">·</span>
                <span className="text-xs text-muted-foreground">{followUpStep.action}</span>
              </div>

              <div className="bg-muted rounded-lg p-3 text-sm relative group/script">
                {interpolateScript(followUpStep.template, contact.first_name)}
                <ShareCopyButton
                  text={interpolateScript(followUpStep.template, contact.first_name)}
                  className="absolute top-2 right-2 size-9 min-h-[44px] min-w-[44px] md:opacity-0 md:group-hover/script:opacity-100 transition-opacity"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-10 flex-1"
                  onClick={handleMarkDone}
                  disabled={acting}
                >
                  <CheckSquare className="size-4 mr-1.5" />
                  Mark Done
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 flex-1"
                  asChild
                >
                  <Link href={`/contacts?openContact=${contact.id}`}>
                    <Play className="size-4 mr-1.5" />
                    Open Flow
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-10 flex-1"
                asChild
              >
                <Link href={`/contacts?openContact=${contact.id}`}>
                  <Play className="size-4 mr-1.5" />
                  Resume
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 flex-1"
                onClick={handleSnooze}
                disabled={acting}
              >
                <TimerReset className="size-4 mr-1.5" />
                Snooze
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
