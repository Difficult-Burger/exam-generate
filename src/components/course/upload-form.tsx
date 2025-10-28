"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";

const schema = z.object({
  courseTitle: z
    .string()
    .min(3, "课程名称至少需要 3 个字符")
    .max(120, "课程名称不要超过 120 个字符"),
  courseDescription: z
    .string()
    .max(500, "描述不要超过 500 个字符")
    .optional(),
});

type FormValues = z.infer<typeof schema>;

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

const readableTypes = "PDF / PPT / PPTX";

export const UploadMaterialForm = ({
  onUploaded,
}: {
  onUploaded?: () => Promise<void> | void;
}) => {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });
  const [slidesFile, setSlidesFile] = useState<File | null>(null);
  const [sampleFile, setSampleFile] = useState<File | null>(null);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validateFile = (file: File | null, isRequired = false) => {
    if (!file) {
      if (isRequired) {
        throw new Error("请上传课程 slides（支持 PDF / PPT / PPTX）");
      }
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      throw new Error(`仅支持上传 ${readableTypes} 文件。`);
    }

    if (file.size > 40 * 1024 * 1024) {
      throw new Error("文件大小不要超过 40MB。");
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      setStatus("uploading");
      setErrorMessage(null);

      validateFile(slidesFile, true);
      validateFile(sampleFile ?? null);

      const formData = new FormData();
      formData.append("courseTitle", values.courseTitle);
      if (values.courseDescription) {
        formData.append("courseDescription", values.courseDescription);
      }
      if (slidesFile) {
        formData.append("slides", slidesFile);
      }
      if (sampleFile) {
        formData.append("sampleExam", sampleFile);
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "上传失败，请稍后再试。");
      }

      reset();
      setSlidesFile(null);
      setSampleFile(null);
      setStatus("success");
      await onUploaded?.();
      router.refresh();
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "上传失败，请稍后重试。",
      );
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">
          上传课程资料
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          slides 必填，样例试卷选填（PDF / PPT / PPTX，最大 40MB）。
        </p>
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          课程名称
          <input
            type="text"
            placeholder="例如：线性代数（下）"
            {...register("courseTitle")}
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
          {errors.courseTitle && (
            <span className="mt-1 block text-xs text-red-500">
              {errors.courseTitle.message}
            </span>
          )}
        </label>

        <label className="block text-sm font-medium text-slate-700">
          课程简介（可选）
          <textarea
            rows={4}
            placeholder="补充考试范围、老师风格、重点章节等信息"
            {...register("courseDescription")}
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
          {errors.courseDescription && (
            <span className="mt-1 block text-xs text-red-500">
              {errors.courseDescription.message}
            </span>
          )}
        </label>

        <label className="block text-sm font-medium text-slate-700">
          课程 slides（必填）
          <input
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setSlidesFile(file);
            }}
            className="mt-1 w-full cursor-pointer rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-8 text-sm text-slate-600 file:hidden"
          />
          {slidesFile && (
            <span className="mt-1 block text-xs text-slate-500">
              已选择：{slidesFile.name}
            </span>
          )}
        </label>

        <label className="block text-sm font-medium text-slate-700">
          样例试卷（可选）
          <input
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setSampleFile(file);
            }}
            className="mt-1 w-full cursor-pointer rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-sm text-slate-600 file:hidden"
          />
          {sampleFile && (
            <span className="mt-1 block text-xs text-slate-500">
              已选择：{sampleFile.name}
            </span>
          )}
        </label>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="submit"
          disabled={status === "uploading"}
          className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "uploading" ? "正在上传..." : "上传并创建题库"}
        </button>

        {status === "success" && (
          <span className="text-sm text-emerald-600">
            上传成功，马上生成试卷吧！
          </span>
        )}
        {status === "error" && errorMessage && (
          <span className="text-sm text-red-500">{errorMessage}</span>
        )}
      </div>
    </form>
  );
};
