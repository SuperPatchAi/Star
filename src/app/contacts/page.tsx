"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserPlus, Users, LayoutList, Columns3 } from "lucide-react";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { ContactsKanban } from "@/components/contacts/contacts-kanban";
import { ContactSheet } from "@/components/contacts/contact-sheet";
import { getContacts } from "@/lib/actions/contacts";
import type { Contact } from "@/lib/db/types";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [view, setView] = useState<"list" | "kanban">("kanban");

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const { data } = await getContacts();
    setContacts((data as Contact[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

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

  const wonCount = contacts.filter(c => c.outcome === "won").length;
  const sampleCount = contacts.filter(c => c.sample_sent).length;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              D2C
            </Badge>
            <span className="text-xs text-muted-foreground">*</span>
            <span className="text-xs text-muted-foreground">
              {contacts.length} contacts
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground">
            Track prospects, conversations, and sample shipments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <Badge variant="secondary" className="text-xs">
              <Users className="size-3 mr-1" />
              {contacts.length} total
            </Badge>
            {wonCount > 0 && (
              <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
                {wonCount} won
              </Badge>
            )}
            {sampleCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {sampleCount} samples sent
              </Badge>
            )}
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-0.5 p-0.5 bg-muted rounded-lg">
            <Button
              variant={view === "list" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setView("list")}
            >
              <LayoutList className="size-3.5" />
            </Button>
            <Button
              variant={view === "kanban" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setView("kanban")}
            >
              <Columns3 className="size-3.5" />
            </Button>
          </div>

          <Button size="sm" onClick={handleAdd}>
            <UserPlus className="size-4 mr-1.5" />
            Add Contact
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Loading contacts...</div>
        </div>
      ) : view === "list" ? (
        <ContactsTable contacts={contacts} onEdit={handleEdit} />
      ) : (
        <ContactsKanban contacts={contacts} onEdit={handleEdit} />
      )}

      <ContactSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        contact={editingContact}
        onSaved={handleSaved}
      />
    </div>
  );
}
