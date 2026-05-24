-- MaPoste Academic Records Portal — Database Schema & Seed Data

-- Citizens
create table if not exists citizens (
  id uuid primary key default gen_random_uuid(),
  nni text unique not null,
  full_name text not null,
  phone text,
  email text,
  created_at timestamptz default now()
);

-- Academic records
create table if not exists academic_records (
  id uuid primary key default gen_random_uuid(),
  citizen_id uuid references citizens(id) on delete cascade,
  institution text not null,
  record_type text not null,
  field_of_study text,
  year_awarded integer,
  mention text,
  status text default 'available',
  created_at timestamptz default now()
);

-- Consent records
create table if not exists consent_records (
  id uuid primary key default gen_random_uuid(),
  citizen_id uuid references citizens(id) on delete cascade,
  institutions_consented text[],
  scope text,
  granted_at timestamptz default now(),
  expires_at timestamptz
);

-- Credentials (issued)
create table if not exists credentials (
  id uuid primary key default gen_random_uuid(),
  citizen_id uuid references citizens(id) on delete cascade,
  record_id uuid references academic_records(id) on delete cascade,
  credential_hash text unique,
  qr_code_url text,
  pdf_url text,
  issued_at timestamptz default now(),
  status text default 'active'
);

-- Sharing events
create table if not exists sharing_events (
  id uuid primary key default gen_random_uuid(),
  credential_id uuid references credentials(id) on delete cascade,
  citizen_id uuid references citizens(id) on delete cascade,
  recipient_name text,
  recipient_email text,
  recipient_organisation text,
  access_level text,
  expires_at timestamptz,
  share_token text unique,
  shared_at timestamptz default now(),
  status text default 'active'
);

-- Audit log
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  citizen_id uuid references citizens(id) on delete set null,
  event_type text not null,
  event_detail jsonb,
  occurred_at timestamptz default now()
);

-- Payments
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  citizen_id uuid references citizens(id) on delete cascade,
  amount integer not null,
  method text,
  status text default 'pending',
  transaction_id text,
  paid_at timestamptz
);

-- Grant access to anon and authenticated roles (required for PostgREST / anon key)
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;

-- Prototype: RLS disabled (no need for policy complexity in a demo)
alter table citizens            disable row level security;
alter table academic_records    disable row level security;
alter table consent_records     disable row level security;
alter table credentials         disable row level security;
alter table sharing_events      disable row level security;
alter table audit_log           disable row level security;
alter table payments            disable row level security;

-- =====================================================
-- SEED DATA
-- =====================================================

-- Test citizen: Awa Koné
insert into citizens (id, nni, full_name, phone, email)
values (
  '00000000-0000-0000-0000-000000000001',
  '10294857362',
  'Awa Koné',
  '+22507123456787',
  'awa.kone@email.ci'
) on conflict (nni) do nothing;

-- Academic record 1: Licence en Informatique (Université FHB)
insert into academic_records (id, citizen_id, institution, record_type, field_of_study, year_awarded, mention, status)
values (
  '00000000-0000-0000-0001-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Université Félix Houphouët-Boigny',
  'degree',
  'Licence en Informatique',
  2023,
  'Bien',
  'available'
) on conflict do nothing;

-- Academic record 2: Baccalauréat Série C (DECO)
insert into academic_records (id, citizen_id, institution, record_type, field_of_study, year_awarded, mention, status)
values (
  '00000000-0000-0000-0001-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'DECO',
  'baccalaureat',
  'Baccalauréat Série C',
  2019,
  'Assez Bien',
  'available'
) on conflict do nothing;
