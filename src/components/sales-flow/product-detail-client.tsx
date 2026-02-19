"use client";

import { useState, useEffect } from "react";
import type { RoadmapV2 } from "@/types/roadmap";
import type { Product } from "@/types";
import type { Contact } from "@/lib/db/types";
import { getContact } from "@/lib/actions/contacts";
import { ProductViewToggle } from "./product-view-toggle";

interface ProductDetailClientProps {
  product: Product;
  roadmap: RoadmapV2 | null;
  referenceContent: React.ReactNode;
  contactId?: string;
}

export function ProductDetailClient({ product, roadmap, referenceContent, contactId }: ProductDetailClientProps) {
  const [initialContact, setInitialContact] = useState<Contact | null>(null);
  const [loadingContact, setLoadingContact] = useState(!!contactId);

  useEffect(() => {
    if (!contactId) return;
    let cancelled = false;
    (async () => {
      setLoadingContact(true);
      const { data } = await getContact(contactId);
      if (!cancelled) {
        setInitialContact(data || null);
        setLoadingContact(false);
      }
    })();
    return () => { cancelled = true; };
  }, [contactId]);

  if (loadingContact) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading contact...</div>
      </div>
    );
  }

  return (
    <ProductViewToggle
      product={product}
      roadmap={roadmap}
      referenceContent={referenceContent}
      initialContact={initialContact || undefined}
    />
  );
}
