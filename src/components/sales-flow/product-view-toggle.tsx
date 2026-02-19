"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TreePine, BookOpen } from "lucide-react";
import type { RoadmapV2 } from "@/types/roadmap";
import type { Product } from "@/types";
import type { Contact } from "@/lib/db/types";
import { DecisionTree } from "./decision-tree";

interface ProductViewToggleProps {
  product: Product;
  roadmap: RoadmapV2 | null;
  referenceContent: React.ReactNode;
  initialContact?: Contact;
}

export function ProductViewToggle({
  product,
  roadmap,
  referenceContent,
  initialContact,
}: ProductViewToggleProps) {
  const [mode, setMode] = useState<"guided" | "reference">(
    roadmap ? "guided" : "reference"
  );

  if (!roadmap) {
    return <>{referenceContent}</>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 p-1 bg-muted rounded-lg w-fit">
        <Button
          variant={mode === "guided" ? "default" : "ghost"}
          size="sm"
          onClick={() => setMode("guided")}
          className="h-8"
        >
          <TreePine className="size-4 mr-1.5" />
          Guided Flow
          <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
            New
          </Badge>
        </Button>
        <Button
          variant={mode === "reference" ? "default" : "ghost"}
          size="sm"
          onClick={() => setMode("reference")}
          className="h-8"
        >
          <BookOpen className="size-4 mr-1.5" />
          Reference
        </Button>
      </div>

      {mode === "guided" ? (
        <DecisionTree
          roadmap={roadmap}
          product={product}
          initialContact={initialContact}
        />
      ) : (
        referenceContent
      )}
    </div>
  );
}
