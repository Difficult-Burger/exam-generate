import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

const ensuredBuckets = new Set<string>();

export const ensureBucket = async (bucketName: string) => {
  if (ensuredBuckets.has(bucketName)) {
    return;
  }

  const supabase = createServiceRoleSupabaseClient();

  const { error: createError } = await supabase.storage.createBucket(
    bucketName,
    {
      public: false,
      fileSizeLimit: 40 * 1024 * 1024, // 40 MB
    },
  );

  if (createError && createError.message !== "The resource already exists") {
    throw new Error(
      `Unable to create or verify storage bucket '${bucketName}': ${createError.message}`,
    );
  }

  ensuredBuckets.add(bucketName);
};
