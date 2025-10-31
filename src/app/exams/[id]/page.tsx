import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { DownloadButton } from "@/components/exams/download-button";

const loadExam = async (examId: string, ownerId: string) => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("exam_generations")
    .select("*")
    .eq("id", examId)
    .eq("owner_id", ownerId)
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data;
};

export default async function ExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const exam = await loadExam(id, user.id);

  if (!exam) {
    notFound();
  }

  const previewUrl = `/api/exams/${exam.id}/preview`;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6 md:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/submissions/${exam.submission_id}`}
          className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回课程详情
        </Link>
        <DownloadButton examId={exam.id} />
      </div>

      <header>
        <h1 className="text-3xl font-bold text-slate-900">
          模拟卷预览
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          生成时间：{new Date(exam.created_at).toLocaleString()}
        </p>
      </header>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        {exam.pdf_storage_path ? (
          <iframe
            src={previewUrl}
            title="PDF 预览"
            className="h-[80vh] w-full"
          />
        ) : (
          <p className="p-6 text-sm text-slate-500">
            尚未生成 PDF。
          </p>
        )}
      </div>
    </div>
  );
}
