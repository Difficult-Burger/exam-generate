import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";
import { PDFDocument } from "pdf-lib";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw new Error(authError.message);
    if (!user) return NextResponse.json({ message: "未登录" }, { status: 401 });

    const { data: exam, error } = await supabase
      .from("exam_generations")
      .select("id, owner_id, pdf_storage_path")
      .eq("id", id)
      .single();

    if (error || !exam)
      return NextResponse.json(
        { message: error?.message ?? "未找到对应试卷" },
        { status: 404 },
      );

    if (exam.owner_id !== user.id)
      return NextResponse.json({ message: "无权限" }, { status: 403 });

    if (!exam.pdf_storage_path)
      return NextResponse.json({ message: "尚未生成 PDF" }, { status: 400 });

    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "course-assets";
    const serviceSupabase = createServiceRoleSupabaseClient();
    const { data: file, error: downloadError } = await serviceSupabase.storage
      .from(bucket)
      .download(exam.pdf_storage_path);

    if (downloadError || !file)
      return NextResponse.json(
        { message: downloadError?.message ?? "无法下载 PDF" },
        { status: 400 },
      );

    const originalBuffer = Buffer.from(await file.arrayBuffer());
    const sourcePdf = await PDFDocument.load(originalBuffer);
    const previewPdf = await PDFDocument.create();
    const pages = sourcePdf.getPageCount();
    const pageIndex = pages > 0 ? 0 : null;

    if (pageIndex === null)
      return NextResponse.json(
        { message: "PDF 内容为空" },
        { status: 400 },
      );

    const [firstPage] = await previewPdf.copyPages(sourcePdf, [pageIndex]);
    previewPdf.addPage(firstPage);
    const previewBuffer = await previewPdf.save();

    return new NextResponse(Buffer.from(previewBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=preview.pdf",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "预览失败" },
      { status: 400 },
    );
  }
}
