import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      throw new Error(authError.message);
    }

    if (!user) {
      return NextResponse.json({ message: "未登录" }, { status: 401 });
    }

    const { data: exam, error } = await supabase
      .from("exam_generations")
      .select("id, owner_id, pdf_storage_path")
      .eq("id", id)
      .single();

    if (error || !exam) {
      return NextResponse.json(
        { message: error?.message ?? "未找到对应试卷" },
        { status: 404 },
      );
    }

    if (exam.owner_id !== user.id) {
      return NextResponse.json(
        { message: "没有下载权限" },
        { status: 403 },
      );
    }

    if (!exam.pdf_storage_path) {
      return NextResponse.json(
        { message: "该试卷尚未生成 PDF。" },
        { status: 400 },
      );
    }

    const url = new URL(request.url);
    const confirmPaid = url.searchParams.get("confirmPaid") === "true";

    const { data: profile } = await supabase
      .from("profiles")
      .select("free_downloads_remaining")
      .eq("id", user.id)
      .maybeSingle();

    let freeDownloadsRemaining =
      profile?.free_downloads_remaining ?? 3;
    let costCents = 0;
    let hasCredits = freeDownloadsRemaining > 0;

    if (hasCredits) {
      const { data: consumed, error: consumeError } =
        await supabase.rpc("consume_free_download", {
          p_user_id: user.id,
        });

      if (consumeError) {
        throw new Error(
          `更新下载额度失败：${consumeError.message}`,
        );
      }

      if (!consumed) {
        hasCredits = false;
      }
    }

    if (!hasCredits) {
      if (!confirmPaid) {
        return NextResponse.json(
          {
            message:
              "免费额度已用完，每份模拟卷下载费用为 1 元。请支付后携带 confirmPaid=true 再次请求。",
            requiresPayment: true,
            freeDownloadsRemaining,
          },
          { status: 402 },
        );
      }

      costCents = 100;
    }

    const { data: updatedProfile } = await supabase
      .from("profiles")
      .select("free_downloads_remaining")
      .eq("id", user.id)
      .maybeSingle();

    freeDownloadsRemaining =
      updatedProfile?.free_downloads_remaining ?? 0;

    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "course-assets";
    const serviceSupabase = createServiceRoleSupabaseClient();
    const { data: signed, error: signedError } =
      await serviceSupabase.storage
        .from(bucket)
        .createSignedUrl(exam.pdf_storage_path, 60);

    if (signedError || !signed?.signedUrl) {
      throw new Error(
        signedError?.message ?? "无法生成下载链接，请稍后重试。",
      );
    }

    const { error: insertError } = await supabase
      .from("download_events")
      .insert({
        generation_id: exam.id,
        user_id: user.id,
        cost_cents: costCents,
      });

    if (insertError) {
      throw new Error(
        `记录下载行为失败：${insertError.message}`,
      );
    }

    return NextResponse.json({
      signedUrl: signed.signedUrl,
      costCents,
      freeDownloadsRemaining,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "下载失败，请稍后再试。",
      },
      { status: 400 },
    );
  }
}
