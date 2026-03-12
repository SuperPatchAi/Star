"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { DecisionTree } from "@/components/sales-flow/decision-tree";
import { getContact } from "@/lib/actions/contacts";
import type { Contact } from "@/lib/db/types";

export default function SalesPage() {
  const searchParams = useSearchParams();
  const contactId = searchParams.get("contactId");

  const [initialContact, setInitialContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(!!contactId);

  useEffect(() => {
    if (!contactId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await getContact(contactId);
      if (!cancelled) {
        setInitialContact(data || null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [contactId]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            D2C
          </Badge>
          <span className="text-xs text-muted-foreground">Sales Flow</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {contactId ? "Resume Conversation" : "New Conversation"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {contactId
            ? "Pick up where you left off with this prospect."
            : "Start a new sales conversation. Add a contact and select products to begin."}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Loading contact...</div>
        </div>
      ) : (
        <DecisionTree
          key={initialContact?.id || "new"}
          initialContact={initialContact || undefined}
        />
      )}
    </div>
  );
}
