-- Create storage bucket for documents (supabase storage config)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  status document_status NOT NULL DEFAULT 'success',
  extracted_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  extracted_text_tsv tsvector
);

-- Create ENUM for document status (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_status') THEN
    CREATE TYPE document_status AS ENUM ('success', 'pending', 'failed');
  END IF;
END$$;

-- Ensure the status column uses the enum type
ALTER TABLE public.documents
  ALTER COLUMN status TYPE document_status USING status::document_status;

ALTER TABLE public.documents
  ALTER COLUMN status SET DEFAULT 'success';

-- Enable RLS on documents table
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for documents
CREATE POLICY IF NOT EXISTS "Users can view their own documents"
  ON public.documents
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own documents"
  ON public.documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own documents"
  ON public.documents
  FOR DELETE
  USING (auth.uid() = user_id);

-- Storage policies for documents bucket objects
CREATE POLICY IF NOT EXISTS "Users can view their own documents in storage"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY IF NOT EXISTS "Users can upload their own documents"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY IF NOT EXISTS "Users can delete their own documents from storage"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);

-- GIN index for full-text search on extracted_text_tsv
CREATE INDEX IF NOT EXISTS idx_documents_extracted_text_tsv
  ON public.documents USING GIN(extracted_text_tsv);

-- Function to update extracted_text_tsv column on insert or update
CREATE OR REPLACE FUNCTION documents_tsvector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.extracted_text_tsv := to_tsvector('english', coalesce(NEW.extracted_text, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update tsvector column on insert or update
CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
ON public.documents FOR EACH ROW EXECUTE PROCEDURE documents_tsvector_trigger();

-- Function to update updated_at timestamp on update
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set updated_at on every update
CREATE TRIGGER update_updated_at BEFORE UPDATE
ON public.documents FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
