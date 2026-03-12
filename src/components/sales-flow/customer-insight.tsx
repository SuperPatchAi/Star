"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Target, AlertTriangle } from "lucide-react";
import type { RoadmapCustomerProfile } from "@/types/roadmap";

interface CustomerInsightProps {
  data: RoadmapCustomerProfile;
  productName: string;
}

export function CustomerInsight({ data, productName }: CustomerInsightProps) {
  const [expanded, setExpanded] = useState(false);

  const hasDemographics = data.content.demographics.length > 0;
  const hasPainPoints = data.content.pain_points.length > 0;
  if (!hasDemographics && !hasPainPoints) return null;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-0 pt-3 px-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between p-0 h-auto hover:bg-transparent"
          onClick={() => setExpanded(!expanded)}
        >
          <CardTitle className="text-xs flex items-center gap-1.5 font-medium text-muted-foreground">
            <Target className="size-3.5" />
            {productName} Customer Profile
          </CardTitle>
          {expanded ? (
            <ChevronUp className="size-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-3.5 text-muted-foreground" />
          )}
        </Button>
      </CardHeader>
      {expanded && (
        <CardContent className="px-4 pb-3 pt-2 space-y-3">
          {hasDemographics && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Target Demographics
              </p>
              <div className="flex flex-wrap gap-1">
                {data.content.demographics.map((item, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] font-normal">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {hasPainPoints && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="size-3" />
                Pain Points to Listen For
              </p>
              <ul className="space-y-0.5">
                {data.content.pain_points.map((point, i) => (
                  <li key={i} className="text-xs text-muted-foreground pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-muted-foreground/50">
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
