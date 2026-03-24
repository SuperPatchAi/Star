"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, LayoutList, Columns3, Search } from "lucide-react";
import { ContactsTable } from "@/components/contacts/contacts-table";
import {
  ContactsKanban,
  KanbanSkeleton,
} from "@/components/contacts/contacts-kanban";
import { ContactSheet } from "@/components/contacts/contact-sheet";
import {
  getContacts,
  updateContactStep,
  updateContactOutcome,
  updateContact,
} from "@/lib/actions/contacts";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Contact, ContactOutcome } from "@/lib/db/types";
import { cn } from "@/lib/utils";

export default function ContactsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [view, setView] = useState<"list" | "kanban">("list");
  const [search, setSearch] = useState("");
  const isMobile = useIsMobile();
  const [openContactHandled, setOpenContactHandled] = useState(false);
  const initialStage = searchParams.get("stage");

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const { data } = await getContacts();
    setContacts((data as Contact[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    if (openContactHandled || loading || contacts.length === 0) return;
    const openId = searchParams.get("openContact");
    if (openId) {
      const found = contacts.find((c) => c.id === openId);
      if (found) {
        setEditingContact(found);
        setSheetOpen(true);
      }
      router.replace("/contacts", { scroll: false });
      setOpenContactHandled(true);
    }
  }, [searchParams, contacts, loading, openContactHandled, router]);

  const handleAdd = () => {
    setEditingContact(null);
    setSheetOpen(true);
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setSheetOpen(true);
  };

  const handleSaved = () => {
    fetchContacts();
  };

  const handleStageChange = useCallback(
    async (contactId: string, newStep: string) => {
      const contact = contacts.find((c) => c.id === contactId);
      if (!contact) return;
      const oldStep = contact.current_step;
      if (oldStep === newStep) return;

      const now = new Date().toISOString();
      setContacts((prev) =>
        prev.map((c) =>
          c.id === contactId
            ? {
                ...c,
                current_step: newStep as Contact["current_step"],
                stage_entered_at: now,
                follow_up_day:
                  newStep === "followup"
                    ? 0
                    : newStep !== "followup"
                      ? null
                      : c.follow_up_day,
              }
            : c
        )
      );

      const { error } = await updateContactStep(contactId, newStep);
      if (error) {
        setContacts((prev) =>
          prev.map((c) =>
            c.id === contactId
              ? {
                  ...c,
                  current_step: oldStep,
                  stage_entered_at: contact.stage_entered_at,
                }
              : c
          )
        );
        return;
      }

      if (newStep === "followup" && oldStep !== "followup") {
        await updateContact(contactId, { follow_up_day: 0 });
      } else if (oldStep === "followup" && newStep !== "followup") {
        await updateContact(contactId, { follow_up_day: null });
      }
    },
    [contacts]
  );

  const handleOutcomeChange = useCallback(
    async (contactId: string, outcome: ContactOutcome) => {
      const contact = contacts.find((c) => c.id === contactId);
      if (!contact) return;
      const oldOutcome = contact.outcome;

      setContacts((prev) =>
        prev.map((c) => (c.id === contactId ? { ...c, outcome } : c))
      );

      const { error } = await updateContactOutcome(contactId, outcome);
      if (error) {
        setContacts((prev) =>
          prev.map((c) =>
            c.id === contactId ? { ...c, outcome: oldOutcome } : c
          )
        );
      }
    },
    [contacts]
  );

  const searchFiltered = search.trim()
    ? contacts.filter((c) => {
        const q = search.toLowerCase();
        const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
        return fullName.includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q);
      })
    : contacts;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground">
            {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={handleAdd} className="hidden md:inline-flex">
          <Plus className="size-4 mr-1.5" />
          Add Contact
        </Button>
      </div>

      {/* View tabs (Pipedrive-style text tabs) */}
      <div className="flex items-center border-b">
        <button
          onClick={() => setView("list")}
          className={cn(
            "flex items-center gap-1.5 px-3 pb-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
            view === "list"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <LayoutList className="size-4" />
          List
        </button>
        <button
          onClick={() => setView("kanban")}
          className={cn(
            "flex items-center gap-1.5 px-3 pb-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
            view === "kanban"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Columns3 className="size-4" />
          Pipeline
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Content */}
      {loading ? (
        view === "kanban" ? (
          <KanbanSkeleton isMobile={isMobile} />
        ) : (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flat-list-row flex items-start gap-3">
                <div className="size-10 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-40 bg-muted animate-pulse rounded" />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="size-5 rounded-full bg-muted animate-pulse" />
                  <div className="h-3 w-14 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        )
      ) : view === "list" ? (
        <ContactsTable contacts={searchFiltered} onEdit={handleEdit} onStartNew={handleAdd} initialStageFilter={initialStage} />
      ) : (
        <ContactsKanban
          contacts={searchFiltered}
          onEdit={handleEdit}
          onStageChange={handleStageChange}
          onOutcomeChange={handleOutcomeChange}
        />
      )}

      {/* FAB - mobile only */}
      <button
        onClick={handleAdd}
        className="fixed bottom-20 right-4 z-40 md:hidden size-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <Plus className="size-6" />
      </button>

      <ContactSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        contact={editingContact}
        onSaved={handleSaved}
      />
    </div>
  );
}
