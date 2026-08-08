"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useStore } from "@/context/StoreContext";
import { SHOP_ITEMS, getShopItem } from "@/lib/shop";
import { rarityColor } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function ShopPage() {
  const { user, players, buyShopItem, equipItem } = useStore();
  const [message, setMessage] = useState("");
  const me = players.find((p) => p.id === user?.id);

  function buy(id: string) {
    const res = buyShopItem(id);
    setMessage(res.ok ? "تم الشراء بنجاح" : res.error || "فشل الشراء");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs tracking-[0.25em] text-[var(--gold)]">SHOP</p>
          <h1 className="section-title mt-2 text-3xl font-bold sm:text-4xl">
            متجر طويق
          </h1>
          <p className="mt-3 max-w-2xl text-[var(--muted)]">
            اشترِ إطارات وألقاب وأوسمة بعملات تجمعها من المشاركة والتأهل.
          </p>
        </div>
        <div className="panel px-4 py-3 text-sm">
          <p className="text-[var(--muted)]">رصيدك</p>
          <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--gold-soft)]">
            {me?.coins ?? 0} 🪙
          </p>
        </div>
      </div>

      {!user ? (
        <EmptyState
          title="سجّل دخولك للمتجر"
          description="أنشئ حساباً واجمع العملات من البطولات ثم تسوّق تحسينات حسابك."
          actionHref="/login"
          actionLabel="تسجيل الدخول"
        />
      ) : (
        <>
          {message ? (
            <p className="mb-4 text-sm text-[var(--gold-soft)]">{message}</p>
          ) : null}

          <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SHOP_ITEMS.map((item) => {
              const owned = me?.inventory.includes(item.id);
              return (
                <div
                  key={item.id}
                  className={cn("panel flex flex-col p-5", rarityColor(item.rarity))}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-3xl">{item.preview}</div>
                    <span className="text-xs uppercase tracking-wider opacity-70">
                      {item.rarity}
                    </span>
                  </div>
                  <h2 className="mt-3 text-lg font-bold">{item.name}</h2>
                  <p className="mt-2 flex-1 text-sm opacity-80">{item.description}</p>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span className="font-[family-name:var(--font-display)] font-bold">
                      {item.price} 🪙
                    </span>
                    {owned ? (
                      <button
                        type="button"
                        className="btn-ghost !px-3 !py-1.5 text-xs"
                        onClick={() =>
                          equipItem(
                            item.id,
                            item.type === "badge" ? "effect" : item.type,
                          )
                        }
                      >
                        تجهيز
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-gold !px-3 !py-1.5 text-xs"
                        onClick={() => buy(item.id)}
                      >
                        <ShoppingBag size={14} />
                        شراء
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <section className="panel p-5">
            <h2 className="mb-3 font-bold">ممتلكاتك</h2>
            {!me?.inventory.length ? (
              <p className="text-sm text-[var(--muted)]">لا تملك عناصر بعد.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {me.inventory.map((id) => {
                  const item = getShopItem(id);
                  if (!item) return null;
                  return (
                    <span
                      key={id}
                      className="border border-white/10 bg-black/30 px-3 py-1.5 text-sm"
                    >
                      {item.preview} {item.name}
                    </span>
                  );
                })}
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-ghost !py-1.5 text-xs"
                onClick={() => equipItem(null, "frame")}
              >
                إزالة الإطار
              </button>
              <button
                type="button"
                className="btn-ghost !py-1.5 text-xs"
                onClick={() => equipItem(null, "title")}
              >
                إزالة اللقب
              </button>
              <Link href={user ? `/players/${user.id}` : "/"} className="btn-ghost !py-1.5 text-xs">
                عرض الملف
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
