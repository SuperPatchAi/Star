import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FlaskConical, Star, Map, MessageSquarePlus } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getProductById, products } from "@/data/products";
import { notFound } from "next/navigation";
import { getWordTrack } from "@/data/wordtracks";
import { ReferenceTabsView } from "@/components/sales-flow/reference-tabs-view";

interface ProductDetailPageProps {
  params: Promise<{ product: string }>;
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { product: productId } = await params;

  const product = getProductById(productId);

  if (!product) {
    notFound();
  }

  const wordTrack = getWordTrack(productId);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="relative size-16 flex-shrink-0 rounded-full overflow-hidden bg-muted shadow-lg">
            <Image
              src={product.image}
              alt={`${product.name} patch`}
              fill
              className="object-cover"
              sizes="64px"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">
                {product.name}
              </h1>
              {product.hasClinicalStudy && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-5 bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800"
                >
                  <FlaskConical className="size-3 mr-0.5" />
                  {product.studyName}
                </Badge>
              )}
              {wordTrack !== null && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-5 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800"
                >
                  Full Word Track
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {wordTrack?.tagline || product.tagline}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-5"
                style={{
                  borderColor: product.color + "40",
                  color: product.color,
                  backgroundColor: product.color + "10",
                }}
              >
                {product.category}
              </Badge>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                D2C
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" asChild>
            <Link href="/sales">
              <MessageSquarePlus className="size-4 mr-1.5" />
              Start Conversation
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/roadmaps">
              <Map className="size-4 mr-1.5" />
              Roadmap
            </Link>
          </Button>
          <Button variant="outline" size="icon" className="size-8">
            <Star className="size-4" />
          </Button>
        </div>
      </div>

      <Separator />

      <ReferenceTabsView product={product} wordTrack={wordTrack} />
    </div>
  );
}

export async function generateStaticParams() {
  return products.map((product) => ({
    product: product.id,
  }));
}
