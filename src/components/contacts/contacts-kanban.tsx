"use client";

import { useMemo, useState, useCallback } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DragDropProvider,
  DragOverlay,
  useDraggable,
  useDroppable,
} from "@dnd-kit/react";
import { useIsMobile } from "@/hooks/use-mobile";
import { KanbanCard } from "./kanban-card";
import type { Contact, ContactOutcome } from "@/lib/db/types";
import { SALES_STEPS } from "@/types/roadmap";
import { cn } from "@/lib/utils";

const kanbanColumns = [
  ...SALES_STEPS.map((s, i) => ({ id: s.id, label: s.label, number: i + 1 })),
  { id: "closed", label: "Closed", number: SALES_STEPS.length + 1 },
];

interface ContactsKanbanProps {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
  onStageChange?: (contactId: string, newStep: string) => void;
  onOutcomeChange?: (contactId: string, outcome: ContactOutcome) => void;
}

function groupByStep(contacts: Contact[]) {
  const groups: Record<string, Contact[]> = {};
  for (const col of kanbanColumns) groups[col.id] = [];
  for (const contact of contacts) {
    const step = contact.current_step || "add_contact";
    if (groups[step]) {
      groups[step].push(contact);
    } else {
      groups["add_contact"]?.push(contact);
    }
  }
  return groups;
}

// --- Draggable card wrapper (desktop only) ---
function DraggableCardWrapper({
  contact,
  onEdit,
  onStageChange,
  onOutcomeChange,
}: {
  contact: Contact;
  onEdit: (contact: Contact) => void;
  onStageChange?: (contactId: string, newStep: string) => void;
  onOutcomeChange?: (contactId: string, outcome: ContactOutcome) => void;
}) {
  const { ref, isDragging } = useDraggable({
    id: contact.id,
    data: { contactId: contact.id, currentStep: contact.current_step },
  });

  return (
    <KanbanCard
      contact={contact}
      onEdit={onEdit}
      onStageChange={onStageChange}
      onOutcomeChange={onOutcomeChange}
      isDragging={isDragging}
      dragRef={ref}
    />
  );
}

// --- Droppable column wrapper (desktop only) ---
function DroppableColumn({
  columnId,
  columnLabel,
  columnNumber,
  items,
  totalContacts,
  children,
}: {
  columnId: string;
  columnLabel: string;
  columnNumber: number;
  items: Contact[];
  totalContacts: number;
  children: React.ReactNode;
}) {
  const { ref, isDropTarget } = useDroppable({ id: columnId });

  return (
    <div ref={ref} className="flex flex-col w-[280px] shrink-0">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="flex items-center justify-center size-5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
          {columnNumber}
        </span>
        <h3 className="text-sm font-semibold">{columnLabel}</h3>
        <span className="text-[11px] text-muted-foreground/60 ml-auto">
          {items.length}/{totalContacts}
        </span>
      </div>
      <div
        className={cn(
          "flex flex-col gap-2 min-h-[120px] rounded-lg p-2 transition-colors",
          isDropTarget
            ? "bg-primary/10 ring-2 ring-primary/30"
            : "bg-muted/30"
        )}
      >
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="text-xs text-muted-foreground">
              {isDropTarget ? "Drop here" : "Empty"}
            </p>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// --- Desktop kanban with DnD ---
function DesktopKanban({
  contacts,
  contactsByStep,
  onEdit,
  onStageChange,
  onOutcomeChange,
}: {
  contacts: Contact[];
  contactsByStep: Record<string, Contact[]>;
  onEdit: (contact: Contact) => void;
  onStageChange?: (contactId: string, newStep: string) => void;
  onOutcomeChange?: (contactId: string, outcome: ContactOutcome) => void;
}) {
  const [draggedContact, setDraggedContact] = useState<Contact | null>(null);

  const handleDragStart = useCallback(
    (event: { operation: { source?: { id?: string | number } | null } }) => {
      const sourceId = event.operation?.source?.id;
      if (sourceId) {
        const c = contacts.find((ct) => ct.id === String(sourceId));
        if (c) setDraggedContact(c);
      }
    },
    [contacts]
  );

  const handleDragEnd = useCallback(
    (event: { operation: { source?: { id?: string | number } | null; target?: { id?: string | number } | null } }) => {
      setDraggedContact(null);
      const sourceId = event.operation?.source?.id;
      const targetId = event.operation?.target?.id;
      if (!sourceId || !targetId) return;
      const contactId = String(sourceId);
      const newStep = String(targetId);
      const contact = contacts.find((c) => c.id === contactId);
      if (!contact || contact.current_step === newStep) return;
      onStageChange?.(contactId, newStep);
    },
    [contacts, onStageChange]
  );

  return (
    <DragDropProvider onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="relative">
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4 min-w-max">
            {kanbanColumns.map((column) => {
              const items = contactsByStep[column.id] || [];
              return (
                <DroppableColumn
                  key={column.id}
                  columnId={column.id}
                  columnLabel={column.label}
                  columnNumber={column.number}
                  items={items}
                  totalContacts={contacts.length}
                >
                  {items.map((contact) => (
                    <DraggableCardWrapper
                      key={contact.id}
                      contact={contact}
                      onEdit={onEdit}
                      onStageChange={onStageChange}
                      onOutcomeChange={onOutcomeChange}
                    />
                  ))}
                </DroppableColumn>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" />
      </div>

      <DragOverlay>
        {draggedContact && (
          <div className="w-[280px] opacity-90 rotate-2 shadow-xl">
            <KanbanCard
              contact={draggedContact}
              onEdit={() => {}}
              isDragging
            />
          </div>
        )}
      </DragOverlay>
    </DragDropProvider>
  );
}

// --- Mobile accordion layout ---
function MobileAccordion({
  contactsByStep,
  totalContacts,
  onEdit,
  onStageChange,
  onOutcomeChange,
}: {
  contactsByStep: Record<string, Contact[]>;
  totalContacts: number;
  onEdit: (contact: Contact) => void;
  onStageChange?: (contactId: string, newStep: string) => void;
  onOutcomeChange?: (contactId: string, outcome: ContactOutcome) => void;
}) {
  const firstNonEmpty = kanbanColumns.find(
    (col) => (contactsByStep[col.id]?.length ?? 0) > 0
  );
  const defaultOpen = firstNonEmpty ? [firstNonEmpty.id] : [];

  return (
    <Accordion type="multiple" defaultValue={defaultOpen} className="w-full">
      {kanbanColumns.map((column) => {
        const items = contactsByStep[column.id] || [];
        const isEmpty = items.length === 0;

        return (
          <AccordionItem key={column.id} value={column.id}>
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="flex items-center justify-center size-5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground shrink-0">
                  {column.number}
                </span>
                <span className="text-sm font-semibold truncate">
                  {column.label}
                </span>
                <span
                  className={cn(
                    "text-[11px] ml-auto shrink-0",
                    isEmpty
                      ? "text-muted-foreground/40"
                      : "text-muted-foreground/60"
                  )}
                >
                  {items.length}/{totalContacts}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {isEmpty ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No contacts in this stage
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {items.map((contact) => (
                    <KanbanCard
                      key={contact.id}
                      contact={contact}
                      onEdit={onEdit}
                      onStageChange={onStageChange}
                      onOutcomeChange={onOutcomeChange}
                    />
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

// --- Skeleton loading states ---
export function KanbanSkeleton({ isMobile }: { isMobile: boolean }) {
  if (isMobile) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border-b last:border-b-0 py-3">
            <div className="flex items-center gap-2">
              <div className="size-5 rounded-full bg-muted animate-pulse" />
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-5 w-8 bg-muted animate-pulse rounded ml-auto" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 pb-4 overflow-hidden">
      {Array.from({ length: 4 }).map((_, colIdx) => (
        <div key={colIdx} className="flex flex-col w-[280px] shrink-0">
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="size-5 rounded-full bg-muted animate-pulse" />
            <div className="h-4 w-20 bg-muted animate-pulse rounded" />
            <div className="h-5 w-8 bg-muted animate-pulse rounded ml-auto" />
          </div>
          <div className="flex flex-col gap-2 min-h-[120px] bg-muted/30 rounded-lg p-2">
            {Array.from({ length: colIdx < 2 ? 2 : 1 }).map((_, cardIdx) => (
              <div
                key={cardIdx}
                className="rounded-lg border bg-card p-3 animate-pulse"
              >
                <div className="flex items-start gap-2">
                  <div className="size-8 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 bg-muted rounded" />
                    <div className="h-3 w-32 bg-muted rounded" />
                    <div className="h-3 w-20 bg-muted rounded" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex gap-1">
                    <div className="size-7 bg-muted rounded" />
                    <div className="size-7 bg-muted rounded" />
                  </div>
                  <div className="h-7 w-16 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Main component ---
export function ContactsKanban({
  contacts,
  onEdit,
  onStageChange,
  onOutcomeChange,
}: ContactsKanbanProps) {
  const isMobile = useIsMobile();
  const contactsByStep = useMemo(() => groupByStep(contacts), [contacts]);

  if (isMobile) {
    return (
      <MobileAccordion
        contactsByStep={contactsByStep}
        totalContacts={contacts.length}
        onEdit={onEdit}
        onStageChange={onStageChange}
        onOutcomeChange={onOutcomeChange}
      />
    );
  }

  return (
    <DesktopKanban
      contacts={contacts}
      contactsByStep={contactsByStep}
      onEdit={onEdit}
      onStageChange={onStageChange}
      onOutcomeChange={onOutcomeChange}
    />
  );
}
