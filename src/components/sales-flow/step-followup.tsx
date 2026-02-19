"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check, Phone, MessageSquare, Mail, CheckCircle, XCircle } from "lucide-react";
import { updateContactOutcome } from "@/lib/actions/contacts";
import type { RoadmapFollowUp } from "@/types/roadmap";

interface StepFollowUpProps {
  data: RoadmapFollowUp;
  contactId?: string;
}

const channelIcons: Record<string, React.ReactNode> = {
  "Text": <MessageSquare className="size-3.5" />,
  "Call": <Phone className="size-3.5" />,
  "Call/Text": <Phone className="size-3.5" />,
  "Email": <Mail className="size-3.5" />,
};

export function StepFollowUp({ data, contactId }: StepFollowUpProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text.trim());
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleOutcome = async (value: "won" | "lost") => {
    setOutcome(value);
    if (contactId) {
      await updateContactOutcome(contactId, value);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {data.goal}
      </p>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-[22px] top-0 bottom-0 w-px bg-border" />

        <div className="space-y-4">
          {data.sequence.map((step, index) => (
            <div key={index} className="relative flex gap-4">
              <div className="relative z-10 flex size-[44px] shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background text-xs font-bold text-primary">
                {step.day.replace("DAY ", "D")}
              </div>

              <Card className="flex-1">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{step.action}</CardTitle>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                        {channelIcons[step.channel] || <MessageSquare className="size-3.5" />}
                        {step.channel}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="text-xs">{step.day}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="bg-muted rounded-lg p-3 text-sm relative group">
                    {step.template}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 size-7 opacity-0 group-hover:opacity-100"
                      onClick={() => handleCopy(step.template, index)}
                    >
                      {copiedIndex === index ? (
                        <Check className="size-3.5 text-green-500" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Outcome actions */}
      {contactId && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4">
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
                    size="sm"
                    className="border-green-300 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
                    onClick={() => handleOutcome("won")}
                  >
                    <CheckCircle className="size-4 mr-1.5" />
                    Won
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-300 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                    onClick={() => handleOutcome("lost")}
                  >
                    <XCircle className="size-4 mr-1.5" />
                    Lost
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
