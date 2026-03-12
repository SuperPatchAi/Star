"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Package,
  Phone,
  Mail,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Repeat,
} from "lucide-react";
import { products } from "@/data/products";
import type { Contact, ContactOutcome } from "@/lib/db/types";
import { SALES_STEPS } from "@/types/roadmap";
import Image from "next/image";

interface ContactsKanbanProps {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
}

const outcomeConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }
> = {
  pending: { label: "Pending", variant: "secondary", icon: <Clock className="size-3" /> },
  won: { label: "Won", variant: "default", icon: <CheckCircle className="size-3" /> },
  lost: { label: "Lost", variant: "destructive", icon: <XCircle className="size-3" /> },
  follow_up: { label: "Follow Up", variant: "outline", icon: <Repeat className="size-3" /> },
};

const kanbanColumns = [
  ...SALES_STEPS.map((s) => ({ id: s.id, label: s.label })),
  { id: "closed", label: "Closed" },
];

export function ContactsKanban({ contacts, onEdit }: ContactsKanbanProps) {
  const getProducts = (productIds: string[]) => products.filter((p) => productIds.includes(p.id));

  const contactsByStep: Record<string, Contact[]> = {};
  for (const col of kanbanColumns) {
    contactsByStep[col.id] = [];
  }
  for (const contact of contacts) {
    const step = contact.current_step || "add_contact";
    if (contactsByStep[step]) {
      contactsByStep[step].push(contact);
    } else {
      contactsByStep["add_contact"]?.push(contact);
    }
  }

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 pb-4 min-w-max">
        {kanbanColumns.map((column) => {
          const items = contactsByStep[column.id] || [];
          return (
            <div key={column.id} className="flex flex-col w-[280px] shrink-0">
              <div className="flex items-center gap-2 mb-3 px-1">
                <h3 className="text-sm font-medium">{column.label}</h3>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                  {items.length}
                </Badge>
              </div>
              <div className="flex flex-col gap-2 min-h-[120px] bg-muted/30 rounded-lg p-2">
                {items.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    No contacts
                  </p>
                )}
                {items.map((contact) => {
                  const contactProducts = getProducts(contact.product_ids);
                  const outcome = outcomeConfig[contact.outcome] || outcomeConfig.pending;
                  return (
                    <Card key={contact.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onEdit(contact)}>
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          {contactProducts.length > 0 && (
                            <div className="flex -space-x-1.5 shrink-0">
                              {contactProducts.slice(0, 2).map(p => (
                                <div key={p.id} className="relative size-8 rounded-full overflow-hidden bg-muted ring-2 ring-background" title={p.name}>
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
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-sm truncate">{contact.first_name} {contact.last_name}</span>
                              <Badge variant={outcome.variant} className="text-[9px] px-1 py-0 h-4 flex items-center gap-0.5">
                                {outcome.icon}
                                {outcome.label}
                              </Badge>
                            </div>
                            {contactProducts.length > 0 && (
                              <p className="text-[11px] text-muted-foreground truncate">{contactProducts.map(p => p.name).join(", ")}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                              {contact.email && (
                                <span className="flex items-center gap-0.5 truncate">
                                  <Mail className="size-2.5" />
                                  {contact.email}
                                </span>
                              )}
                              {contact.phone && (
                                <span className="flex items-center gap-0.5">
                                  <Phone className="size-2.5" />
                                  {contact.phone}
                                </span>
                              )}
                            </div>
                            {contact.sample_sent && (
                              <Badge className="text-[9px] px-1 py-0 h-4 mt-1 bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
                                <Package className="size-2.5 mr-0.5" />
                                Sample Sent
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex justify-end">
                          <Button variant="ghost" size="sm" className="h-6 text-[11px] px-2" asChild onClick={(e) => e.stopPropagation()}>
                            <Link href={`/sales?contactId=${contact.id}`}>
                              <Play className="size-3 mr-1" />
                              Resume
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
