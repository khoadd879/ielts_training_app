-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- IELTS Reading Table
-- ============================================
CREATE TABLE IF NOT EXISTS ielts_reading (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding VECTOR(768),
  skill TEXT DEFAULT 'reading',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ielts_reading_embedding_idx
ON ielts_reading USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS ielts_reading_metadata_idx
ON ielts_reading USING gin (metadata);

-- ============================================
-- IELTS Listening Table
-- ============================================
CREATE TABLE IF NOT EXISTS ielts_listening (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding VECTOR(768),
  skill TEXT DEFAULT 'listening',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ielts_listening_embedding_idx
ON ielts_listening USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS ielts_listening_metadata_idx
ON ielts_listening USING gin (metadata);

-- ============================================
-- IELTS Speaking Table
-- ============================================
CREATE TABLE IF NOT EXISTS ielts_speaking (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding VECTOR(768),
  skill TEXT DEFAULT 'speaking',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ielts_speaking_embedding_idx
ON ielts_speaking USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS ielts_speaking_metadata_idx
ON ielts_speaking USING gin (metadata);

-- ============================================
-- IELTS Writing Table
-- ============================================
CREATE TABLE IF NOT EXISTS ielts_writing (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding VECTOR(768),
  skill TEXT DEFAULT 'writing',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ielts_writing_embedding_idx
ON ielts_writing USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS ielts_writing_metadata_idx
ON ielts_writing USING gin (metadata);

-- ============================================
-- Helper Functions
-- ============================================

-- Search function for reading
CREATE OR REPLACE FUNCTION search_ielts_reading(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (id TEXT, content TEXT, metadata JSONB, similarity FLOAT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.content,
    r.metadata,
    1 - (r.embedding <=> query_embedding) AS similarity
  FROM ielts_reading r
  WHERE 1 - (r.embedding <=> query_embedding) > match_threshold
  ORDER BY r.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Search function for listening
CREATE OR REPLACE FUNCTION search_ielts_listening(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (id TEXT, content TEXT, metadata JSONB, similarity FLOAT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.content,
    r.metadata,
    1 - (r.embedding <=> query_embedding) AS similarity
  FROM ielts_listening r
  WHERE 1 - (r.embedding <=> query_embedding) > match_threshold
  ORDER BY r.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Search function for speaking
CREATE OR REPLACE FUNCTION search_ielts_speaking(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (id TEXT, content TEXT, metadata JSONB, similarity FLOAT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.content,
    r.metadata,
    1 - (r.embedding <=> query_embedding) AS similarity
  FROM ielts_speaking r
  WHERE 1 - (r.embedding <=> query_embedding) > match_threshold
  ORDER BY r.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Search function for writing
CREATE OR REPLACE FUNCTION search_ielts_writing(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (id TEXT, content TEXT, metadata JSONB, similarity FLOAT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.content,
    r.metadata,
    1 - (r.embedding <=> query_embedding) AS similarity
  FROM ielts_writing r
  WHERE 1 - (r.embedding <=> query_embedding) > match_threshold
  ORDER BY r.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;