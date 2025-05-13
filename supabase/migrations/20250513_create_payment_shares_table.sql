-- Create payment shares table
CREATE TABLE IF NOT EXISTS payment_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_batch_id TEXT REFERENCES document_batches(id) NOT NULL,
  person_name TEXT NOT NULL,
  amount_to_pay DECIMAL(10,2) NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indices for faster lookups
CREATE INDEX IF NOT EXISTS payment_shares_document_batch_id_idx ON payment_shares (document_batch_id);

-- Add RLS policies
ALTER TABLE payment_shares ENABLE ROW LEVEL SECURITY;

-- Define RLS policies
CREATE POLICY "Users can view payment shares through document batches"
  ON payment_shares
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM document_batches
      WHERE document_batches.id = payment_shares.document_batch_id
      AND document_batches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert payment shares through document batches"
  ON payment_shares
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM document_batches
      WHERE document_batches.id = document_batch_id
      AND document_batches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update payment shares through document batches"
  ON payment_shares
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM document_batches
      WHERE document_batches.id = payment_shares.document_batch_id
      AND document_batches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete payment shares through document batches"
  ON payment_shares
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM document_batches
      WHERE document_batches.id = payment_shares.document_batch_id
      AND document_batches.user_id = auth.uid()
    )
  ); 