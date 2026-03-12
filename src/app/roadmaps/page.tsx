"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Maximize2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { PRODUCTS } from "@/data/products";

function getRoadmapImagePath(productId: string): string {
  return `/roadmaps/d2c/${productId}.png`;
}

interface RoadmapViewerProps {
  roadmap: {
    id: string;
    name: string;
    description: string;
    image?: string;
  };
}

function RoadmapViewer({ roadmap }: RoadmapViewerProps) {
  const [zoom, setZoom] = useState(1);
  const imagePath = getRoadmapImagePath(roadmap.id);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleReset = () => setZoom(1);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="min-h-[44px]">
          <Maximize2 className="size-4 mr-1" />
          View
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full">
        <DialogHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <DialogTitle className="flex items-center gap-2">
              {roadmap.image ? (
                <div className="relative size-6 flex-shrink-0 rounded-full overflow-hidden">
                  <Image
                    src={roadmap.image}
                    alt={roadmap.name}
                    fill
                    className="object-cover"
                    sizes="24px"
                  />
                </div>
              ) : null}
              {roadmap.name} Sales Roadmap
            </DialogTitle>
            <DialogDescription>
              {roadmap.description} - D2C Sales
            </DialogDescription>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <Button variant="outline" size="icon" className="size-9 min-h-[44px] min-w-[44px]" onClick={handleZoomOut}>
              <ZoomOut className="size-4" />
            </Button>
            <Badge variant="secondary" className="px-2 min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </Badge>
            <Button variant="outline" size="icon" className="size-9 min-h-[44px] min-w-[44px]" onClick={handleZoomIn}>
              <ZoomIn className="size-4" />
            </Button>
            <Button variant="outline" size="icon" className="size-9 min-h-[44px] min-w-[44px]" onClick={handleReset}>
              <RotateCcw className="size-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="relative overflow-auto max-h-[calc(95vh-120px)] bg-muted/30 rounded-lg">
          <div
            className="transition-transform duration-200 origin-top-left"
            style={{ transform: `scale(${zoom})` }}
          >
            <Image
              src={imagePath}
              alt={`${roadmap.name} Sales Roadmap`}
              width={3840}
              height={2160}
              className="w-full h-auto"
              priority
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function RoadmapsPage() {
  const roadmaps = PRODUCTS.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.tagline,
    emoji: p.emoji,
    image: p.image,
  }));

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">
            {roadmaps.length} roadmaps
          </p>
          <h1 className="text-xl font-semibold tracking-tight">
            D2C Sales Roadmaps
          </h1>
          <p className="text-sm text-muted-foreground">
            Direct-to-consumer sales process visualizations
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {roadmaps.map((roadmap) => {
            const imagePath = getRoadmapImagePath(roadmap.id);
            return (
              <Card key={roadmap.id} className="group overflow-hidden border-border/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    {roadmap.image ? (
                      <div className="relative size-8 flex-shrink-0 rounded-full overflow-hidden">
                        <Image
                          src={roadmap.image}
                          alt={roadmap.name}
                          fill
                          className="object-cover"
                          sizes="32px"
                        />
                      </div>
                    ) : (
                      <span className="text-xl">{roadmap.emoji}</span>
                    )}
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm font-medium truncate">
                        {roadmap.name}
                      </CardTitle>
                      <CardDescription className="text-xs truncate">
                        {roadmap.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                    <Image
                      src={imagePath}
                      alt={`${roadmap.name} Roadmap`}
                      fill
                      className="object-cover object-top"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />

                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 flex items-end justify-center gap-2 md:inset-0 md:bg-black/60 md:opacity-0 md:group-hover:opacity-100 md:transition-opacity md:items-center md:p-0">
                      <RoadmapViewer roadmap={roadmap} />

                      <Button variant="secondary" size="sm" className="min-h-[44px]" asChild>
                        <a href={imagePath} download={`${roadmap.id}-roadmap.png`}>
                          <Download className="size-4 mr-1" />
                          Download
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="bg-muted/30 mt-4 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">About These Roadmaps</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>
              Each roadmap provides a step-by-step visual guide for the sales
              process, from initial contact to close and follow-up.
            </p>
            <p>
              <strong>Resolution:</strong> 4K quality for print and presentation.
            </p>
            <p>
              <strong>Usage:</strong> Display during training, print for desk
              reference, or share digitally with your team.
            </p>
          </CardContent>
        </Card>
    </div>
  );
}
