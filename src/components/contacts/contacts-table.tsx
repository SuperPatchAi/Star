"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Search,
  MoreHorizontal,
  Package,
  Phone,
  Mail,
  StickyNote,
  MapPin,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  Repeat,
  Play,
} from "lucide-react";
import { toggleSampleSent, updateContactOutcome, deleteContact } from "@/lib/actions/contacts";
import { products } from "@/data/products";
import type { Contact, ContactOutcome } from "@/lib/db/types";
import Image from "next/image";

interface ContactsTableProps {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
}

const stepLabels: Record<string, string> = {
  add_contact: "Add Contact",
  opening: "Opening",
  discovery: "Discovery",
  presentation: "Presentation",
  samples: "Send Samples",
  objections: "Objections",
  closing: "Closing",
  followup: "Follow-Up",
  closed: "Closed",
};

function formatAddress(contact: Contact): string | null {
  const parts = [contact.address_line1, contact.address_city, contact.address_state, contact.address_zip].filter(Boolean);
  if (parts.length === 0) return null;
  const street = [contact.address_line1, contact.address_line2].filter(Boolean).join(", ");
  const cityStateZip = [contact.address_city, [contact.address_state, contact.address_zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return [street, cityStateZip].filter(Boolean).join(", ");
}

const outcomeConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  pending: { label: "Pending", variant: "secondary", icon: <Clock className="size-3" /> },
  won: { label: "Won", variant: "default", icon: <CheckCircle className="size-3" /> },
  lost: { label: "Lost", variant: "destructive", icon: <XCircle className="size-3" /> },
  follow_up: { label: "Follow Up", variant: "outline", icon: <Repeat className="size-3" /> },
};

export function ContactsTable({ contacts: initialContacts, onEdit }: ContactsTableProps) {
  const [contacts, setContacts] = useState(initialContacts);
  const [search, setSearch] = useState("");
  const [filterProduct, setFilterProduct] = useState<string>("all");
  const [filterOutcome, setFilterOutcome] = useState<string>("all");
  const [filterSample, setFilterSample] = useState<string>("all");

  const filtered = contacts.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) &&
        !c.email?.toLowerCase().includes(search.toLowerCase()) &&
        !c.phone?.includes(search)) return false;
    if (filterProduct !== "all" && c.product_id !== filterProduct) return false;
    if (filterOutcome !== "all" && c.outcome !== filterOutcome) return false;
    if (filterSample === "sent" && !c.sample_sent) return false;
    if (filterSample === "not_sent" && c.sample_sent) return false;
    return true;
  });

  const handleToggleSample = async (contact: Contact) => {
    const newValue = !contact.sample_sent;
    setContacts(prev => prev.map(c =>
      c.id === contact.id
        ? { ...c, sample_sent: newValue, sample_sent_at: newValue ? new Date().toISOString() : null }
        : c
    ));
    await toggleSampleSent(contact.id, newValue);
  };

  const handleOutcome = async (contact: Contact, outcome: ContactOutcome) => {
    setContacts(prev => prev.map(c =>
      c.id === contact.id ? { ...c, outcome } : c
    ));
    await updateContactOutcome(contact.id, outcome);
  };

  const handleDelete = async (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
    await deleteContact(id);
  };

  const getProduct = (productId: string) => products.find(p => p.id === productId);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={filterProduct} onValueChange={setFilterProduct}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Product" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            {products.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterOutcome} onValueChange={setFilterOutcome}>
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="Outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="won">Won</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
            <SelectItem value="follow_up">Follow Up</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSample} onValueChange={setFilterSample}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Sample" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Samples</SelectItem>
            <SelectItem value="sent">Sample Sent</SelectItem>
            <SelectItem value="not_sent">Not Sent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} contact{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Contact cards */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No contacts found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((contact) => {
            const product = getProduct(contact.product_id);
            const outcome = outcomeConfig[contact.outcome] || outcomeConfig.pending;

            return (
              <Card key={contact.id} className="group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Product avatar */}
                      {product && (
                        <div className="relative size-10 flex-shrink-0 rounded-full overflow-hidden bg-muted">
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-sm">{contact.name}</h3>
                          <Badge variant={outcome.variant} className="text-[10px] px-1.5 py-0 h-5 flex items-center gap-1">
                            {outcome.icon}
                            {outcome.label}
                          </Badge>
                          {contact.sample_sent && (
                            <Badge className="text-[10px] px-1.5 py-0 h-5 bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
                              <Package className="size-3 mr-0.5" />
                              Sample Sent
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {product && <span>{product.name}</span>}
                          <span>Step: {stepLabels[contact.current_step] || contact.current_step}</span>
                          {contact.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="size-3" />
                              {contact.email}
                            </span>
                          )}
                          {contact.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="size-3" />
                              {contact.phone}
                            </span>
                          )}
                        </div>

                        {contact.notes && (
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1 flex items-start gap-1">
                            <StickyNote className="size-3 mt-0.5 shrink-0" />
                            {contact.notes}
                          </p>
                        )}

                        {(contact.opening_type || (contact.objections_encountered && contact.objections_encountered.length > 0) || contact.closing_technique || (contact.questions_asked && contact.questions_asked.length > 0)) && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {contact.opening_type && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                                Opening: {contact.opening_type}
                              </Badge>
                            )}
                            {contact.questions_asked && contact.questions_asked.length > 0 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                                {contact.questions_asked.length} question{contact.questions_asked.length !== 1 ? "s" : ""} asked
                              </Badge>
                            )}
                            {contact.objections_encountered && contact.objections_encountered.length > 0 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-amber-300 text-amber-700 dark:text-amber-400">
                                {contact.objections_encountered.length} objection{contact.objections_encountered.length !== 1 ? "s" : ""}
                              </Badge>
                            )}
                            {contact.closing_technique && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                                Close: {contact.closing_technique}
                              </Badge>
                            )}
                          </div>
                        )}

                        {formatAddress(contact) && (
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1 flex items-start gap-1">
                            <MapPin className="size-3 mt-0.5 shrink-0" />
                            {formatAddress(contact)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        asChild
                      >
                        <Link href={`/products/${contact.product_id}?contactId=${contact.id}`}>
                          <Play className="size-3.5 mr-1" />
                          Resume
                        </Link>
                      </Button>
                      <Button
                        variant={contact.sample_sent ? "default" : "outline"}
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => handleToggleSample(contact)}
                      >
                        <Package className="size-3.5 mr-1" />
                        {contact.sample_sent ? "Sent" : "Send Sample"}
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(contact)}>
                            <Edit className="size-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleOutcome(contact, "won")}>
                            <CheckCircle className="size-4 mr-2 text-green-500" />
                            Mark Won
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOutcome(contact, "lost")}>
                            <XCircle className="size-4 mr-2 text-red-500" />
                            Mark Lost
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOutcome(contact, "follow_up")}>
                            <Repeat className="size-4 mr-2 text-blue-500" />
                            Follow Up
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOutcome(contact, "pending")}>
                            <Clock className="size-4 mr-2" />
                            Reset to Pending
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="size-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete contact?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete {contact.name} from your contacts.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(contact.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
