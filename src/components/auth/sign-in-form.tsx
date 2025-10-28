"use client";

import { FormEvent, useState } from "react";
import { useSupabaseClient } from "@/components/providers/supabase-provider";

export const SignInForm = () => {
  const supabase = useSupabaseClient();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setStatus("submitting");
      setMessage(null);

      const redirectTo =
        `${process.env.NEXT_PUBLIC_SITE_URL || location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        throw error;
      }

      setStatus("success");
      setMessage("验证邮件已发送，请在 5 分钟内完成登录。");
      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "发送登录邮件失败，请重试。",
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-lg"
    >
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          登录 / 注册
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          使用学校或常用邮箱，我们会发送一次性验证码。
        </p>
      </div>

      <label className="text-sm font-medium text-slate-700">
        邮箱
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          placeholder="you@example.com"
          className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </label>

      <button
        type="submit"
        disabled={status === "submitting" || !email}
        className="inline-flex justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "submitting" ? "发送中..." : "获取验证码"}
      </button>

      {message && (
        <p
          className={`text-sm ${
            status === "error" ? "text-red-500" : "text-emerald-600"
          }`}
        >
          {message}
        </p>
      )}
    </form>
  );
};
