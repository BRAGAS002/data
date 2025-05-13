
-- Create document batches table to store calculation history
CREATE TABLE IF NOT EXISTS document_batches (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  total_documents INTEGER NOT NULL,
  total_pages INTEGER NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  price_per_page DECIMAL(10,2) NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indices for faster lookups
CREATE INDEX IF NOT EXISTS document_batches_user_id_idx ON document_batches (user_id);

-- Add RLS policies so users can only access their own data
ALTER TABLE document_batches ENABLE ROW LEVEL SECURITY;

-- Define RLS policies
CREATE POLICY "Users can view their own document batches"
  ON document_batches
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own document batches"
  ON document_batches
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own document batches"
  ON document_batches
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own document batches"
  ON document_batches
  FOR DELETE
  USING (auth.uid() = user_id);
