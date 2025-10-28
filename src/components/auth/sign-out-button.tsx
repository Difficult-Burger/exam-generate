"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSupabaseClient } from "@/components/providers/supabase-provider";

export const SignOutButton = () => {
  const supabase = useSupabaseClient();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
    >
      <LogOut className="mr-2 h-4 w-4" />
      退出登录
    </button>
  );
};
