"use client";

import { useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/types";

interface ProductTabsProps {
  products: Product[];
  children: (activeProduct: Product) => React.ReactNode;
}

export function ProductTabs({ products, children }: ProductTabsProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (products.length === 0) return null;

  if (products.length === 1) {
    return <>{children(products[0])}</>;
  }

  const activeProduct = products[activeIndex];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg overflow-x-auto">
        {products.map((product, index) => (
          <button
            key={product.id}
            onClick={() => setActiveIndex(index)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-all ${
              index === activeIndex
                ? "bg-background shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="relative size-5 flex-shrink-0 rounded-full overflow-hidden bg-muted">
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-cover"
                sizes="20px"
              />
            </div>
            <span className="flex flex-col items-start">
              <span>{product.name}</span>
              {index === activeIndex && (
                <span className="text-[10px] text-muted-foreground font-normal">{product.tagline}</span>
              )}
            </span>
          </button>
        ))}
      </div>
      {children(activeProduct)}
    </div>
  );
}
