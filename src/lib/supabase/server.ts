import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CookieOptions } from "@supabase/ssr";
import type { Database } from "@/types/database";

const ensureEnv = (key: string, value: string | undefined) => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const supabaseUrl = () =>
  ensureEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );

const supabaseAnonKey = () =>
  ensureEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

export const createServerSupabaseClient =
  async (): Promise<SupabaseClient<Database>> =>
    createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
      cookies: {
        async get(name: string) {
          return (await cookies()).get(name)?.value;
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            (await cookies()).set({ name, value, ...options });
          } catch {
            // cookies() 在部分渲染场景只读
          }
        },
        async remove(name: string, options: CookieOptions) {
          try {
            (await cookies()).set({ name, value: "", ...options, maxAge: 0 });
          } catch {
            // same as above
          }
        },
      },
    });

export const createServiceRoleSupabaseClient =
  (): SupabaseClient<Database> => {
    const serviceKey = ensureEnv(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    return createClient<Database>(supabaseUrl(), serviceKey);
  };
