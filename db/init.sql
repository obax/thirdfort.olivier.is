CREATE TYPE document_status AS ENUM ('pending', 'verified', 'rejected');

CREATE TABLE documents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename    TEXT NOT NULL,
    content_type TEXT NOT NULL,
    file_size   BIGINT NOT NULL,
    status      document_status NOT NULL DEFAULT 'pending',
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
