CREATE TABLE patient_concerns (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), clinic_id UUID NOT NULL REFERENCES clinics(id),
 patient_id UUID NOT NULL REFERENCES users(id), request_key UUID NOT NULL, concern TEXT NOT NULL CHECK(length(concern) BETWEEN 10 AND 4000),
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed','spam')),
 dentist_id UUID REFERENCES dentists(id), created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(patient_id,request_key)
);
CREATE UNIQUE INDEX patient_concerns_one_open ON patient_concerns(patient_id,clinic_id) WHERE status='open';
CREATE INDEX patient_concerns_queue ON patient_concerns(clinic_id,created_at DESC,id);
CREATE INDEX patient_concerns_patient ON patient_concerns(patient_id,created_at DESC);
CREATE TABLE concern_messages (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), concern_id UUID NOT NULL REFERENCES patient_concerns(id),
 author_id UUID NOT NULL REFERENCES users(id), request_key UUID NOT NULL,
 kind TEXT NOT NULL DEFAULT 'message' CHECK(kind IN ('message','event')), body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 4000),
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(author_id,request_key)
);
CREATE INDEX concern_messages_thread ON concern_messages(concern_id,created_at,id);
CREATE INDEX concern_messages_author ON concern_messages(author_id,created_at);
CREATE TABLE clinic_concern_restrictions (
 clinic_id UUID NOT NULL REFERENCES clinics(id), patient_id UUID NOT NULL REFERENCES users(id),
 restricted_until TIMESTAMPTZ NOT NULL, PRIMARY KEY(clinic_id,patient_id)
);
