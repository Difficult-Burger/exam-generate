export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          free_downloads_remaining: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          free_downloads_remaining?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          free_downloads_remaining?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      course_submissions: {
        Row: {
          id: string;
          owner_id: string;
          course_title: string;
          course_description: string | null;
          slides_storage_path: string;
          sample_storage_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          course_title: string;
          course_description?: string | null;
          slides_storage_path: string;
          sample_storage_path?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          course_title?: string;
          course_description?: string | null;
          slides_storage_path?: string;
          sample_storage_path?: string | null;
          created_at?: string;
        };
      };
      exam_generations: {
        Row: {
          id: string;
          submission_id: string;
          owner_id: string;
          status: string;
          model: string | null;
          prompt: string | null;
          output_markdown: string | null;
          pdf_storage_path: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          owner_id: string;
          status?: string;
          model?: string | null;
          prompt?: string | null;
          output_markdown?: string | null;
          pdf_storage_path?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          submission_id?: string;
          owner_id?: string;
          status?: string;
          model?: string | null;
          prompt?: string | null;
          output_markdown?: string | null;
          pdf_storage_path?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      download_events: {
        Row: {
          id: number;
          generation_id: string;
          user_id: string;
          cost_cents: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          generation_id: string;
          user_id: string;
          cost_cents?: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          generation_id?: string;
          user_id?: string;
          cost_cents?: number;
          created_at?: string;
        };
      };
    };
    Functions: {
      consume_free_download: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
    };
  };
}
