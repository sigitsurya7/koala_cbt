"use client";

import { ReactNode, useEffect } from "react";
import { HeroUIProvider } from "@heroui/system";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useRouter } from "next/navigation";
import { Toaster } from "react-hot-toast";
import { useApp } from "@/stores/useApp";

export default function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  const app = useApp();

  useEffect(() => {
    app.loadBootstrap().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <NextThemesProvider attribute="class" defaultTheme="light" themes={["light", "dark", "koala"]} enableSystem>
      <HeroUIProvider
        navigate={(path) => {
          router.push(String(path));
        }}
      >
        {children}
        <Toaster position="top-center" />
      </HeroUIProvider>
    </NextThemesProvider>
  );
}

