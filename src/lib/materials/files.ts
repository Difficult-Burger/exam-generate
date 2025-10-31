import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

export interface StoredMaterialFile {
  buffer: Buffer;
  mimeType: string | null;
  fileName: string;
  storagePath: string;
}

const bucketName = () =>
  process.env.SUPABASE_STORAGE_BUCKET || "course-assets";

const downloadSingle = async (
  storagePath: string,
): Promise<StoredMaterialFile> => {
  const supabase = createServiceRoleSupabaseClient();

  const { data, error } = await supabase.storage
    .from(bucketName())
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
    storagePath,
  };
};

export const parseStoragePaths = (raw: string | null | undefined) => {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === "string") as string[];
    }
  } catch {
    // fallback: treat as single path
  }

  return raw ? [raw] : [];
};

export const downloadMaterialFiles = async (
  rawPaths: string | null | undefined,
): Promise<StoredMaterialFile[]> => {
  const paths = parseStoragePaths(rawPaths);
  return Promise.all(paths.map((path) => downloadSingle(path)));
};
