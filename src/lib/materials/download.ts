import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

export interface StoredMaterialFile {
  buffer: Buffer;
  mimeType: string | null;
  fileName: string;
}

export const downloadMaterialFile = async (
  storagePath: string,
): Promise<StoredMaterialFile> => {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "course-assets";
  const supabase = createServiceRoleSupabaseClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .download(storagePath);

  if (error || !data) {
    throw new Error(
      `无法下载文件 ${storagePath}: ${error?.message ?? "未知错误"}`,
    );
  }

  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const segments = storagePath.split("/");
  const fileName = segments[segments.length - 1] || "source";

  return {
    buffer,
    mimeType: data.type ?? null,
    fileName,
  };
};
