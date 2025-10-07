"use client";

import { ReactNode } from "react";
import { HeroUIProvider } from "@heroui/system";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useRouter } from "next/navigation";
import { Toaster } from "react-hot-toast";

export default function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();

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

