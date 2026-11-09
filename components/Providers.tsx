"use client";

import type { ReactNode } from "react";
import ConfigError from "@/components/ConfigError";
import Header from "@/components/Header";
import { NameProvider } from "@/hooks/useName";
import { ToastProvider } from "@/hooks/useToast";
import { configStatus, isSupabaseConfigured } from "@/lib/supabase";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <NameProvider>
        <Header />
        {isSupabaseConfigured ? children : <ConfigError status={configStatus} />}
      </NameProvider>
    </ToastProvider>
  );
}
