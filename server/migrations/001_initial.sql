CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO owners (id) VALUES ('00000000-0000-4000-8000-000000000001')
ON CONFLICT DO NOTHING;

CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (btrim(name) <> ''),
  normalized_name text NOT NULL CHECK (btrim(normalized_name) <> ''),
  candidate_portal_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, normalized_name)
);

CREATE TABLE recruiting_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  season text NOT NULL CHECK (season IN ('Spring', 'Summer', 'Fall', 'Winter')),
  year integer NOT NULL CHECK (year BETWEEN 2000 AND 2200),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, season, year)
);

CREATE TABLE applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  recruiting_cycle_id uuid NOT NULL REFERENCES recruiting_cycles(id) ON DELETE RESTRICT,
  role_title text NOT NULL CHECK (btrim(role_title) <> ''),
  normalized_role_title text NOT NULL CHECK (btrim(normalized_role_title) <> ''),
  submission_date date NOT NULL,
  application_url text,
  external_application_id text,
  location text,
  work_arrangement text CHECK (work_arrangement IN ('remote', 'hybrid', 'on-site')),
  is_referred boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, company_id, normalized_role_title, recruiting_cycle_id)
);

CREATE UNIQUE INDEX applications_owner_external_id_unique
  ON applications (owner_id, external_application_id)
  WHERE external_application_id IS NOT NULL;

CREATE TABLE gmail_connections (
  owner_id uuid PRIMARY KEY REFERENCES owners(id) ON DELETE CASCADE,
  encrypted_refresh_token text NOT NULL,
  gmail_address text NOT NULL,
  connected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE inbox_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  gmail_message_id text NOT NULL,
  proposal jsonb NOT NULL,
  original_proposal jsonb NOT NULL,
  state text NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'accepted', 'dismissed')),
  confidence numeric(4,3),
  rationale text NOT NULL,
  edited_before_acceptance boolean NOT NULL DEFAULT false,
  target_application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, gmail_message_id)
);

ALTER TABLE applications ADD COLUMN inbox_item_id uuid REFERENCES inbox_items(id) ON DELETE SET NULL;

CREATE TABLE application_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'submitted', 'assessment_scheduled', 'assessment_completed', 'recruiter_screen',
    'interview_scheduled', 'interview_completed', 'offer_received', 'offer_accepted',
    'offer_declined', 'rejected', 'withdrawn', 'other'
  )),
  occurred_on date NOT NULL,
  scheduled_time time,
  time_zone text,
  round_label text,
  notes text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  inbox_item_id uuid REFERENCES inbox_items(id) ON DELETE SET NULL,
  CHECK (
    event_type <> 'interview_scheduled'
    OR (scheduled_time IS NOT NULL AND time_zone IS NOT NULL)
  ),
  CHECK (scheduled_time IS NULL OR event_type = 'interview_scheduled'),
  CHECK (time_zone IS NULL OR event_type = 'interview_scheduled'),
  CHECK (round_label IS NULL OR event_type IN (
    'assessment_scheduled', 'assessment_completed',
    'interview_scheduled', 'interview_completed'
  ))
);

CREATE INDEX application_events_ordering
  ON application_events (application_id, occurred_on, recorded_at, id);

CREATE TABLE processed_gmail_messages (
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  gmail_message_id text NOT NULL,
  classification_outcome text NOT NULL CHECK (classification_outcome IN ('recruiting', 'non_recruiting')),
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, gmail_message_id)
);

CREATE TABLE sync_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  requested_start date NOT NULL,
  requested_end date NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  state text NOT NULL DEFAULT 'running' CHECK (state IN ('running', 'succeeded', 'partial_failure', 'failed')),
  scanned_count integer NOT NULL DEFAULT 0 CHECK (scanned_count >= 0),
  created_inbox_item_count integer NOT NULL DEFAULT 0 CHECK (created_inbox_item_count >= 0),
  skipped_processed_count integer NOT NULL DEFAULT 0 CHECK (skipped_processed_count >= 0),
  checkpoint timestamptz,
  failure_message text,
  CHECK (requested_start <= requested_end)
);

CREATE INDEX inbox_items_owner_state_created ON inbox_items (owner_id, state, created_at DESC);
CREATE INDEX sync_activities_owner_started ON sync_activities (owner_id, started_at DESC);
