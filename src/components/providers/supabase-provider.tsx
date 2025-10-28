"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { useSupabaseBrowser } from "@/lib/supabase/browser";

const SupabaseContext = createContext<SupabaseClient<Database> | null>(null);

export const SupabaseProvider = ({ children }: { children: ReactNode }) => {
  const supabase = useSupabaseBrowser();

  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  );
};

export const useSupabaseClient = () => {
  const context = useContext(SupabaseContext);

  if (!context) {
    throw new Error("useSupabaseClient must be used inside SupabaseProvider.");
  }

  return context;
};
