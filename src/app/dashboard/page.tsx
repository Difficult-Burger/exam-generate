import Link from "next/link";
import { redirect } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { UploadMaterialForm } from "@/components/course/upload-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { parseStoragePaths } from "@/lib/materials/files";

const fetchSubmissions = async (userId: string) => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("course_submissions")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load submissions: ${error.message}`);
  }

  return data ?? [];
};

const fetchProfile = async (userId: string) => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("free_downloads_remaining")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load profile", error);
    return { free_downloads_remaining: 3 };
  }

  return data ?? { free_downloads_remaining: 3 };
};

const fetchDownloadStats = async (userId: string) => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("download_events")
    .select("cost_cents")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load download stats", error);
    return { totalDownloads: 0, paidDownloads: 0 };
  }

  const totalDownloads = data?.length ?? 0;
  const paidDownloads =
    data?.filter((item) => (item.cost_cents ?? 0) > 0).length ?? 0;

  return { totalDownloads, paidDownloads };
};

const emptyState = (
  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
    <UploadCloud className="h-10 w-10 text-slate-400" />
    <h3 className="mt-4 text-lg font-medium text-slate-900">
      还没有上传任何课程资料
    </h3>
    <p className="mt-2 max-w-md text-sm text-slate-500">
      上传 slides（必填）和样例试卷（可选），我们会基于资料自动生成模拟卷。
    </p>
  </div>
);

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const submissions = await fetchSubmissions(user.id);
  const profile = await fetchProfile(user.id);
  const downloadStats = await fetchDownloadStats(user.id);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6 md:p-10">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>欢迎回来，{user.email}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">
            我的课程题库
          </h1>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              产品介绍
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            剩余免费下载
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {profile.free_downloads_remaining ?? 0} 次
          </p>
          <p className="mt-1 text-xs text-slate-400">
            首次注册自动获得 3 次。额度耗尽后可付费下载。
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            累计下载
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {downloadStats.totalDownloads} 份
          </p>
          <p className="mt-1 text-xs text-slate-400">
            其中付费下载 {downloadStats.paidDownloads} 份。
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            温馨提醒
          </p>
          <p className="mt-2 text-sm text-slate-600">
            如果需要额外下载，请支付 1 元后点击「我已支付」继续。
          </p>
        </div>
      </section>

      <UploadMaterialForm />

      <section className="mt-8">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            最近上传
          </h2>
        </div>

        {submissions.length === 0 ? (
          emptyState
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {submissions.map((submission) => {
              const slidePaths = parseStoragePaths(
                submission.slides_storage_path,
              );
              const samplePaths = parseStoragePaths(
                submission.sample_storage_path,
              );

              return (
                <article
                  key={submission.id}
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <h3 className="text-lg font-medium text-slate-900">
                    {submission.course_title}
                  </h3>
                  {submission.course_description && (
                    <p className="mt-2 text-sm text-slate-600">
                      {submission.course_description}
                    </p>
                  )}
                  <dl className="mt-4 grid grid-cols-2 gap-y-1 text-xs text-slate-500">
                    <div>
                      <dt>slides</dt>
                      <dd className="truncate">
                        {slidePaths.length > 0
                          ? `${slidePaths.length} 个文件`
                          : "未上传"}
                      </dd>
                    </div>
                    <div>
                      <dt>样例试卷</dt>
                      <dd className="truncate">
                        {samplePaths.length > 0
                          ? `${samplePaths.length} 个文件`
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>上传时间</dt>
                      <dd>
                        {new Date(submission.created_at).toLocaleString()}
                      </dd>
                    </div>
                  </dl>
                  <Link
                    href={`/submissions/${submission.id}`}
                    className="mt-4 inline-flex items-center text-sm font-medium text-slate-700 hover:text-slate-900"
                  >
                    查看详情
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
