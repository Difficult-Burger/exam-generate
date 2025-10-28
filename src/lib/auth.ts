import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export const getCurrentUser = async () => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Failed to fetch user session", error);
    return null;
  }

  return user;
};
