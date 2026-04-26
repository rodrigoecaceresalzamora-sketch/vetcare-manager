-- ============================================================
-- VetCare Manager — Migration 021
-- Create secure, private bucket for medical documents
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('medical_documents', 'medical_documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Disable RLS bypass for this specific bucket by enforcing policies
-- (Make sure storage.objects has RLS enabled)

CREATE POLICY "Allow authenticated read on medical_documents" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'medical_documents' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert on medical_documents" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'medical_documents' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete on medical_documents" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'medical_documents' AND auth.role() = 'authenticated');
