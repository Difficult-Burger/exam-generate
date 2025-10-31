import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ensureBucket } from "@/lib/storage/bucket";
import type { Database } from "@/types/database";

const MAX_FILE_SIZE_MB = 40;
const ACCEPTED_MIME = [
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

const filterFiles = (entries: FormDataEntryValue[]) =>
  entries.filter((value): value is File => value instanceof File);

const validateFiles = (
  files: File[],
  field: string,
  isRequired: boolean,
) => {
  if (!files.length) {
    if (isRequired) {
      throw new Error(`Missing required file: ${field}`);
    }
    return [];
  }

  files.forEach((file) => {
    if (!ACCEPTED_MIME.includes(file.type)) {
      throw new Error(
        `${field} must be a PDF or PowerPoint file. Received ${file.type}`,
      );
    }

    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_FILE_SIZE_MB) {
      throw new Error(`${field} exceeds the ${MAX_FILE_SIZE_MB}MB limit.`);
    }
  });

  return files;
};

const uploadToStorage = async (
  supabase: SupabaseClient<Database>,
  bucketName: string,
  userId: string,
  file: File,
  folder: string,
) => {
  const arrayBuffer = await file.arrayBuffer();
  const path = `${userId}/${folder}/${randomUUID()}-${file.name}`;

  const { error } = await supabase.storage
    .from(bucketName)
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload ${file.name}: ${error.message}`);
  }

  return path;
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      throw new Error(authError.message);
    }

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const courseTitle = String(formData.get("courseTitle") || "").trim();
    const courseDescription = String(
      formData.get("courseDescription") || "",
    ).trim();

    if (!courseTitle) {
      return NextResponse.json(
        { message: "Course title is required." },
        { status: 400 },
      );
    }

    const slidesEntries = filterFiles(formData.getAll("slides"));
    const sampleEntries = filterFiles(formData.getAll("sampleExam"));

    const slidesFiles = validateFiles(slidesEntries, "slides", true);
    const sampleFiles = validateFiles(sampleEntries, "sampleExam", false);

    if (!slidesFiles.length) {
      return NextResponse.json(
        { message: "Slides file is required." },
        { status: 400 },
      );
    }

    const bucketName =
      process.env.SUPABASE_STORAGE_BUCKET || "course-assets";

    await ensureBucket(bucketName);

    const uploadFiles = async (files: File[], folder: string) => {
      const paths: string[] = [];
      for (const file of files) {
        const path = await uploadToStorage(
          supabase,
          bucketName,
          user.id,
          file,
          folder,
        );
        paths.push(path);
      }
      return paths;
    };

    const slidesPaths = await uploadFiles(slidesFiles, "slides");
    const samplePaths = await uploadFiles(sampleFiles, "samples");

    const { data, error } = await supabase
      .from("course_submissions")
      .insert({
        owner_id: user.id,
        course_title: courseTitle,
        course_description: courseDescription || null,
        slides_storage_path: JSON.stringify(slidesPaths),
        sample_storage_path: samplePaths.length
          ? JSON.stringify(samplePaths)
          : null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ submission: data }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ message }, { status: 400 });
  }
}
