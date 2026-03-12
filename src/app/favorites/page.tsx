"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Heart, Trash2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ShareCopyButton } from "@/components/ui/share-copy-button";

type FavoriteItem = {
  id: string;
  type: "script" | "objection" | "product";
  title: string;
  content: string;
  productName?: string;
  productEmoji?: string;
  addedAt: Date;
};

const demoFavorites: FavoriteItem[] = [
  {
    id: "1",
    type: "script",
    title: "Freedom Cold Call Opening",
    content:
      "Hi [Name], I'm calling because many of my clients have been dealing with chronic pain that impacts their daily life. Our Freedom patch offers a clinically-proven, drug-free solution. Do you have 2 minutes to hear how it works?",
    productName: "Freedom",
    productEmoji: "🔵",
    addedAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    type: "objection",
    title: "Price Objection Response",
    content:
      "I understand cost is a concern. At about $3 per day, many customers find SuperPatch replaces multiple products they were using. Plus, with our 30-day guarantee, you can try it completely risk-free.",
    productName: "All Products",
    productEmoji: "⭐",
    addedAt: new Date("2024-01-14"),
  },
  {
    id: "3",
    type: "script",
    title: "REM Sleep Study Talking Point",
    content:
      "In our HARMONI study, 80% of participants stopped using their sleep medications during the 14-day trial. They saw sleep onset times drop from 69 minutes to just 37 minutes - that's 46% faster.",
    productName: "REM",
    productEmoji: "🟣",
    addedAt: new Date("2024-01-13"),
  },
  {
    id: "4",
    type: "product",
    title: "Liberty Quick Reference",
    content:
      "Drug-free balance support. Key stat: 31% improvement in balance scores (p<0.05). Best for seniors, athletes recovering from injury, or anyone concerned about stability.",
    productName: "Liberty",
    productEmoji: "🟢",
    addedAt: new Date("2024-01-12"),
  },
];

const TABS = [
  { value: "all", label: "All" },
  { value: "scripts", label: "Scripts" },
  { value: "objections", label: "Objections" },
  { value: "products", label: "Products" },
] as const;

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(demoFavorites);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["value"]>("all");

  const scripts = favorites.filter((f) => f.type === "script");
  const objections = favorites.filter((f) => f.type === "objection");
  const productFavs = favorites.filter((f) => f.type === "product");

  const tabCounts = {
    all: favorites.length,
    scripts: scripts.length,
    objections: objections.length,
    products: productFavs.length,
  };

  const displayedItems =
    activeTab === "all"
      ? favorites
      : activeTab === "scripts"
        ? scripts
        : activeTab === "objections"
          ? objections
          : productFavs;

  const handleRemove = (id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  };

  const FavoriteRow = ({ item }: { item: FavoriteItem }) => (
    <div className="flat-list-row group">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {item.productEmoji && (
              <span className="text-lg shrink-0">{item.productEmoji}</span>
            )}
            <div>
              <h2 className="text-base font-semibold truncate">{item.title}</h2>
              {item.productName && (
                <p className="text-xs text-muted-foreground">{item.productName}</p>
              )}
            </div>
          </div>
          <span className="text-xs text-muted-foreground shrink-0 capitalize">
            {item.type}
          </span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-3">
          {item.content}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <ShareCopyButton text={item.content} variant="labeled" className="h-8 px-2 text-xs" iconClassName="size-3" />
            {item.productName && item.productName !== "All Products" && (
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" asChild>
                <Link href={`/products/${item.productName.toLowerCase()}`}>
                  <ExternalLink className="size-3 mr-1" />
                  View
                </Link>
              </Button>
            )}
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove from favorites?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove &ldquo;{item.title}&rdquo; from your favorites. You can
                  always add it back later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleRemove(item.id)}>
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );

  const EmptyState = ({ type }: { type: string }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Heart className="size-12 text-muted-foreground/30 mb-3" />
      <p className="text-sm text-muted-foreground">
        No favorite {type} yet.
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        Click the heart icon on any {type} to save it here.
      </p>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Favorites</h1>
          <p className="text-sm text-muted-foreground">
            Your saved scripts, objections, and quick references.
            {favorites.length > 0 && (
              <span className="ml-1">({favorites.length} saved)</span>
            )}
          </p>
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-center py-12">
          <div>
            <Heart className="size-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-1">No favorites yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Click the heart icon on any script, objection, or product to
              save it here for quick access.
            </p>
            <Button asChild className="mt-4">
              <Link href="/products">Browse Products</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1">
          <div className="flex items-center border-b overflow-x-auto scrollbar-none">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "shrink-0 px-3 pb-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                  activeTab === tab.value
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label} ({tabCounts[tab.value]})
              </button>
            ))}
          </div>

          <div className="mt-4">
            {displayedItems.length > 0 ? (
              <div className="space-y-0">
                {displayedItems.map((item) => (
                  <FavoriteRow key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <EmptyState
                type={
                  activeTab === "scripts"
                    ? "scripts"
                    : activeTab === "objections"
                      ? "objections"
                      : "products"
                }
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
