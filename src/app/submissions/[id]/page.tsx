import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Eye, ArrowLeft } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { ExamGenerationForm } from "@/components/exams/generation-form";
import { DownloadButton } from "@/components/exams/download-button";

const loadSubmission = async (submissionId: string, ownerId: string) => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("course_submissions")
    .select("*")
    .eq("id", submissionId)
    .eq("owner_id", ownerId)
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data;
};

const loadExamGenerations = async (submissionId: string) => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("exam_generations")
    .select("*")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data ?? [];
};

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const submission = await loadSubmission(id, user.id);

  if (!submission) {
    notFound();
  }

  const generations = await loadExamGenerations(submission.id);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6 md:p-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回我的课程
        </Link>
        <span className="text-xs uppercase tracking-wide text-slate-400">
          submission #{submission.id.slice(0, 8)}
        </span>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          {submission.course_title}
        </h1>
        {submission.course_description && (
          <p className="mt-2 text-sm text-slate-600">
            {submission.course_description}
          </p>
        )}
        <dl className="mt-4 grid grid-cols-1 gap-y-2 text-sm text-slate-500 md:grid-cols-2">
          <div>
            <dt className="font-medium text-slate-700">slides</dt>
            <dd className="truncate">{submission.slides_storage_path}</dd>
          </div>
          {submission.sample_storage_path && (
            <div>
              <dt className="font-medium text-slate-700">样例试卷</dt>
              <dd className="truncate">
                {submission.sample_storage_path}
              </dd>
            </div>
          )}
          <div>
            <dt className="font-medium text-slate-700">上传时间</dt>
            <dd>{new Date(submission.created_at).toLocaleString()}</dd>
          </div>
        </dl>
      </section>

      <ExamGenerationForm submissionId={submission.id} />

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            历史生成记录
          </h2>
          <span className="text-sm text-slate-500">
            共 {generations.length} 份
          </span>
        </div>

        {generations.length === 0 ? (
          <div className="mt-6 rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            还没有生成记录，点击上方按钮立即创建第一份模拟卷。
          </div>
        ) : (
          <div className="mt-4 divide-y divide-slate-200">
            {generations.map((exam) => (
              <div
                key={exam.id}
                className="flex flex-col items-start justify-between gap-3 py-4 md:flex-row md:items-center"
              >
                <div>
                  <h3 className="text-base font-medium text-slate-900">
                    模拟卷 #{exam.id.slice(0, 8)}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {new Date(exam.created_at).toLocaleString()} · 模型{" "}
                    {exam.model ?? "gpt-4o-mini"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/exams/${exam.id}`}
                    className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    在线预览
                  </Link>
                  {exam.pdf_storage_path && (
                    <DownloadButton examId={exam.id} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
