"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

interface DownloadButtonProps {
  examId: string;
  variant?: "primary" | "ghost";
}

export const DownloadButton = ({
  examId,
  variant = "primary",
}: DownloadButtonProps) => {
  const [status, setStatus] = useState<
    "idle" | "loading" | "requiresPayment" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [remainingCredits, setRemainingCredits] = useState<
    number | null
  >(null);

  const triggerDownload = async (confirmPaid: boolean) => {
    try {
      setStatus("loading");
      setMessage(null);

      const search = confirmPaid ? "?confirmPaid=true" : "";
      const response = await fetch(
        `/api/exams/${examId}/download${search}`,
      );

      if (response.status === 200) {
        const payload = (await response.json()) as {
          signedUrl: string;
          costCents: number;
          freeDownloadsRemaining: number;
        };

        setRemainingCredits(payload.freeDownloadsRemaining);
        if (typeof window !== "undefined") {
          const gtag = (window as typeof window & {
            gtag?: (...args: unknown[]) => void;
          }).gtag;
          gtag?.("event", "download_exam", {
            exam_id: examId,
            cost_cents: payload.costCents,
          });
        }
        window.location.href = payload.signedUrl;
        setStatus("idle");
        return;
      }

      if (response.status === 402) {
        const payload = await response.json();
        setStatus("requiresPayment");
        setMessage(
          payload.message ||
            "免费额度已用完，请支付 1 元后继续下载。",
        );
        setRemainingCredits(payload.freeDownloadsRemaining ?? 0);
        return;
      }

      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || "下载失败，请稍后再试。");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "下载失败，请重试。",
      );
    }
  };

  const baseClass =
    variant === "primary"
      ? "inline-flex items-center rounded-md border border-indigo-600 bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      : "inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => triggerDownload(false)}
        disabled={status === "loading"}
        className={baseClass}
      >
        {status === "loading" ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            正在生成链接...
          </>
        ) : (
          "下载 PDF"
        )}
      </button>

      {status === "requiresPayment" && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-700">
          <p>{message}</p>
          <button
            type="button"
            onClick={() => triggerDownload(true)}
            className="mt-2 inline-flex items-center rounded-md bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-500"
          >
            我已支付，继续下载
          </button>
        </div>
      )}

      {status === "error" && message && (
        <p className="text-xs text-red-500">{message}</p>
      )}

      {remainingCredits !== null && status !== "requiresPayment" && (
        <p className="text-xs text-slate-500">
          剩余免费下载次数：{remainingCredits}
        </p>
      )}
    </div>
  );
};
