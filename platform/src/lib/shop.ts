export type ShopItemType = "frame" | "title" | "badge" | "effect";

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  type: ShopItemType;
  price: number;
  preview: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "frame-gold",
    name: "إطار ذهبي",
    description: "إطار فاخر يظهر حول صورتك في الموقع.",
    type: "frame",
    price: 120,
    preview: "🟡",
    rarity: "rare",
  },
  {
    id: "frame-tuwaiq",
    name: "إطار طويق",
    description: "إطار أسود ذهبي بهوية قروب طويق.",
    type: "frame",
    price: 180,
    preview: "🖤",
    rarity: "epic",
  },
  {
    id: "frame-fire",
    name: "إطار ناري",
    description: "لإظهار سلسلة انتصاراتك.",
    type: "frame",
    price: 220,
    preview: "🔥",
    rarity: "epic",
  },
  {
    id: "title-legend",
    name: "لقب: أسطورة",
    description: "يظهر بجانب اسمك في الملف والترتيب.",
    type: "title",
    price: 250,
    preview: "👑",
    rarity: "legendary",
  },
  {
    id: "title-falcon",
    name: "لقب: الصقر",
    description: "لقب تنافسي خفيف وسريع.",
    type: "title",
    price: 150,
    preview: "🦅",
    rarity: "rare",
  },
  {
    id: "title-king",
    name: "لقب: ملك الكأس",
    description: "لقب خاص بأبطال البطولات.",
    type: "title",
    price: 300,
    preview: "🏆",
    rarity: "legendary",
  },
  {
    id: "badge-vip",
    name: "وسام VIP",
    description: "شارة تظهر في ملفك الشخصي.",
    type: "badge",
    price: 100,
    preview: "⭐",
    rarity: "rare",
  },
  {
    id: "badge-founder",
    name: "وسام الجيل الأول",
    description: "للأعضاء الأوائل في المنصة.",
    type: "badge",
    price: 80,
    preview: "🎖️",
    rarity: "common",
  },
  {
    id: "effect-glow",
    name: "توهج ذهبي",
    description: "لمسة بصرية خفيفة على بطاقة اللاعب.",
    type: "effect",
    price: 160,
    preview: "✨",
    rarity: "epic",
  },
];

export function getShopItem(id: string) {
  return SHOP_ITEMS.find((i) => i.id === id);
}
