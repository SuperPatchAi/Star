"use client";

import { useState } from "react";
import Image from "next/image";
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

  const showCompact = products.length > 3;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg overflow-x-auto scrollbar-none snap-x snap-mandatory">
        {products.map((product, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={product.id}
              onClick={() => setActiveIndex(index)}
              className={`flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-md text-sm whitespace-nowrap transition-all snap-start shrink-0 ${
                isActive
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="relative size-6 flex-shrink-0 rounded-full overflow-hidden bg-muted">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="24px"
                />
              </div>
              <span className={`flex flex-col items-start ${showCompact && !isActive ? "sr-only sm:not-sr-only" : ""}`}>
                <span>{product.name}</span>
                {isActive && (
                  <span className="text-[10px] text-muted-foreground font-normal">{product.tagline}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      {children(activeProduct)}
    </div>
  );
}
