"use client";

import { StoreProvider } from "@/context/StoreContext";
import { PageTransition } from "@/components/ui/PageTransition";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <PageTransition>{children}</PageTransition>
    </StoreProvider>
  );
}
