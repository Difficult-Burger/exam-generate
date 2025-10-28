"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const difficultyOptions = [
  { value: "easy", label: "基础" },
  { value: "medium", label: "适中" },
  { value: "hard", label: "拔高" },
];

const questionCounts = [10, 15, 20, 25, 30];

export const ExamGenerationForm = ({
  submissionId,
  onGenerated,
}: {
  submissionId: string;
  onGenerated?: () => Promise<void> | void;
}) => {
  const router = useRouter();
  const [questionCount, setQuestionCount] = useState<number>(20);
  const [difficulty, setDifficulty] = useState<string>("medium");
  const [instructions, setInstructions] = useState<string>("");
  const [status, setStatus] = useState<
    "idle" | "generating" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleGenerate = async () => {
    try {
      setStatus("generating");
      setMessage(null);

      const response = await fetch("/api/generate-exam", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          submissionId,
          questionCount,
          difficulty,
          extraInstructions: instructions || null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "生成失败，请稍后再试。");
      }

      setStatus("success");
      setMessage("生成成功！可以在下方查看最新的模拟卷。");
      await onGenerated?.();
      if (typeof window !== "undefined") {
        const gtag = (window as typeof window & {
          gtag?: (...args: unknown[]) => void;
        }).gtag;
        gtag?.("event", "generate_exam", {
          submission_id: submissionId,
          question_count: questionCount,
          difficulty,
        });
      }
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "生成失败，请重试。",
      );
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">
          生成新的模拟卷
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          根据课程 slides 和样例试卷自动生成 Markdown 模拟卷，并导出 PDF。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm font-medium text-slate-700">
          题量
          <select
            value={questionCount}
            onChange={(event) => setQuestionCount(Number(event.target.value))}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            {questionCounts.map((count) => (
              <option key={count} value={count}>
                {count} 道题
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700">
          难度
          <select
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            {difficultyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700 md:col-span-3">
          额外提示（可选）
          <textarea
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            rows={3}
            placeholder="例如：增加线性代数第三章的题量；保持含答案提示。"
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
        </label>
      </div>

      <div className="mt-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={status === "generating"}
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          {status === "generating" ? "生成中..." : "开始生成"}
        </button>
        {message && (
          <span
            className={`text-sm ${
              status === "error" ? "text-red-500" : "text-emerald-600"
            }`}
          >
            {message}
          </span>
        )}
      </div>
    </div>
  );
};
