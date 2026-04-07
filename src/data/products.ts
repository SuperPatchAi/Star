import { Product } from "@/types";

export const products: Product[] = [
  {
    id: "freedom",
    name: "Freedom",
    tagline: "Drug-Free Pain Relief",
    category: "pain",
    emoji: "🔵",
    color: "#0055B8",
    image: "/patches/freedom.png",
    hasClinicalStudy: true,
    studyName: "RESTORE Study",
  },
  {
    id: "rem",
    name: "REM",
    tagline: "Drug-Free Sleep Support",
    category: "sleep",
    emoji: "🟣",
    color: "#652F6C",
    image: "/patches/rem.png",
    hasClinicalStudy: true,
    studyName: "HARMONI Study",
  },
  {
    id: "liberty",
    name: "Liberty",
    tagline: "Drug-Free Balance Support",
    category: "balance",
    emoji: "🟢",
    color: "#66C9BA",
    image: "/patches/liberty.png",
    hasClinicalStudy: true,
    studyName: "Balance Study",
  },
  {
    id: "boost",
    name: "Boost",
    tagline: "Drug-Free Energy Support",
    category: "energy",
    emoji: "⚡",
    color: "#FFC629",
    image: "/patches/boost.png",
    hasClinicalStudy: false,
  },
  {
    id: "victory",
    name: "Victory",
    tagline: "Drug-Free Performance Support",
    category: "performance",
    emoji: "🏆",
    color: "#DD0604",
    image: "/patches/victory.png",
    hasClinicalStudy: false,
  },
  {
    id: "focus",
    name: "Focus",
    tagline: "Drug-Free Concentration Support",
    category: "focus",
    emoji: "🎯",
    color: "#009ADE",
    image: "/patches/focus.png",
    hasClinicalStudy: false,
  },
  {
    id: "defend",
    name: "Defend",
    tagline: "Drug-Free Immune Support",
    category: "immunity",
    emoji: "🛡️",
    color: "#66C9BA",
    image: "/patches/defend.png",
    hasClinicalStudy: false,
  },
  {
    id: "ignite",
    name: "Ignite",
    tagline: "Drug-Free Metabolic Support",
    category: "metabolism",
    emoji: "🔥",
    color: "#FFA400",
    image: "/patches/ignite.png",
    hasClinicalStudy: false,
  },
  {
    id: "kick-it",
    name: "Kick It",
    tagline: "Drug-Free Willpower Support",
    category: "habits",
    emoji: "✊",
    color: "#4D4D4D",
    image: "/patches/kick-it.png",
    hasClinicalStudy: false,
  },
  {
    id: "peace",
    name: "Peace",
    tagline: "Drug-Free Stress Support",
    category: "stress",
    emoji: "☮️",
    color: "#652F6C",
    image: "/patches/peace.png",
    hasClinicalStudy: false,
  },
  {
    id: "joy",
    name: "Joy",
    tagline: "Drug-Free Mood Support",
    category: "mood",
    emoji: "😊",
    color: "#FFC629",
    image: "/patches/joy.png",
    hasClinicalStudy: false,
  },
  {
    id: "lumi",
    name: "Lumi",
    tagline: "Drug-Free Beauty Support",
    category: "beauty",
    emoji: "✨",
    color: "#9D1D96",
    image: "/patches/lumi.png",
    hasClinicalStudy: false,
  },
  {
    id: "rocket",
    name: "Rocket",
    tagline: "Drug-Free Men's Vitality",
    category: "mens",
    emoji: "🚀",
    color: "#101010",
    image: "/patches/rocket.png",
    hasClinicalStudy: false,
  },
];

export const getProductById = (id: string): Product | undefined => {
  return products.find((p) => p.id === id);
};

export const getProductsByCategory = (category: string): Product[] => {
  return products.filter((p) => p.category === category);
};

export const getProductsWithStudies = (): Product[] => {
  return products.filter((p) => p.hasClinicalStudy);
};

export const getPatchImage = (productId: string): string => {
  const product = getProductById(productId);
  return product?.image || `/patches/${productId}.png`;
};

export const PRODUCTS = products;

/**
 * Maps ByDesign product names/SKUs to internal product IDs.
 * Keys are lowercase ByDesign product name fragments.
 */
export const BYDESIGN_SKU_MAP: Record<string, string> = {
  freedom: "freedom",
  rem: "rem",
  liberty: "liberty",
  boost: "boost",
  victory: "victory",
  focus: "focus",
  defend: "defend",
  ignite: "ignite",
  "kick it": "kick-it",
  kickit: "kick-it",
  peace: "peace",
  joy: "joy",
  lumi: "lumi",
  rocket: "rocket",
};

export function matchByDesignProduct(productName: string): string | null {
  const lower = productName.toLowerCase().trim();
  for (const [key, id] of Object.entries(BYDESIGN_SKU_MAP)) {
    if (lower.includes(key)) return id;
  }
  return null;
}
