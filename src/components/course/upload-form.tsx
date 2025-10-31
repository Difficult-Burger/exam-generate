"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
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
  const [slidesFiles, setSlidesFiles] = useState<File[]>([]);
  const [sampleFiles, setSampleFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mergeUnique = (current: File[], incoming: File[]) => {
    const merged = [...current, ...incoming];
    const seen = new Set<string>();
    const result: File[] = [];
    merged.forEach((file) => {
      const key = `${file.name}-${file.size}-${file.lastModified}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(file);
      }
    });
    return result;
  };

  const removeFile = (
    setter: Dispatch<SetStateAction<File[]>>,
    target: File,
  ) => {
    setter((prev) =>
      prev.filter(
        (file) =>
          !(
            file.name === target.name &&
            file.size === target.size &&
            file.lastModified === target.lastModified
          ),
      ),
    );
  };

  const validateFiles = (files: File[], isRequired = false) => {
    if (!files.length) {
      if (isRequired) {
        throw new Error("请至少上传 1 个课程 slides（支持 PDF / PPT / PPTX）");
      }
      return;
    }

    files.forEach((file) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        throw new Error(`仅支持上传 ${readableTypes} 文件。`);
      }

      if (file.size > 40 * 1024 * 1024) {
        throw new Error("单个文件大小不要超过 40MB。");
      }
    });
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      setStatus("uploading");
      setErrorMessage(null);

      validateFiles(slidesFiles, true);
      validateFiles(sampleFiles);

      const formData = new FormData();
      formData.append("courseTitle", values.courseTitle);
      if (values.courseDescription) {
        formData.append("courseDescription", values.courseDescription);
      }
      slidesFiles.forEach((file) => {
        formData.append("slides", file);
      });
      sampleFiles.forEach((file) => {
        formData.append("sampleExam", file);
      });

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "上传失败，请稍后再试。");
      }

      reset();
      setSlidesFiles([]);
      setSampleFiles([]);
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
          课程 slides（必填，可多选）
          <input
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            multiple
            onChange={(event) => {
              const files = event.target.files
                ? Array.from(event.target.files)
                : [];
      setSlidesFiles((prev) => mergeUnique(prev, files));
            }}
            className="mt-1 w-full cursor-pointer rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-8 text-sm text-slate-600 file:hidden"
          />
          {slidesFiles.length > 0 && (
            <ul className="mt-2 space-y-2 text-xs text-slate-500">
              {slidesFiles.map((file) => (
                <li
                  key={`${file.name}-${file.size}-${file.lastModified}`}
                  className="flex items-center justify-between rounded bg-slate-100 px-2 py-1"
                >
                  <span className="truncate pr-2">{file.name}</span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      removeFile(setSlidesFiles, file);
                    }}
                    className="text-slate-500 transition hover:text-slate-800"
                  >
                    移除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </label>

        <label className="block text-sm font-medium text-slate-700">
          样例试卷（可选，可多选）
          <input
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            multiple
            onChange={(event) => {
              const files = event.target.files
                ? Array.from(event.target.files)
                : [];
      setSampleFiles((prev) => mergeUnique(prev, files));
            }}
            className="mt-1 w-full cursor-pointer rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-sm text-slate-600 file:hidden"
          />
          {sampleFiles.length > 0 && (
            <ul className="mt-2 space-y-2 text-xs text-slate-500">
              {sampleFiles.map((file) => (
                <li
                  key={`${file.name}-${file.size}-${file.lastModified}`}
                  className="flex items-center justify-between rounded bg-slate-100 px-2 py-1"
                >
                  <span className="truncate pr-2">{file.name}</span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      removeFile(setSampleFiles, file);
                    }}
                    className="text-slate-500 transition hover:text-slate-800"
                  >
                    移除
                  </button>
                </li>
              ))}
            </ul>
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
