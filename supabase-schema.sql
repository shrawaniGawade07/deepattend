-- ═══════════════════════════════════════════════════════════
-- DeepAttend — Supabase Schema
-- Run this in the Supabase SQL editor to create all tables.
-- ═══════════════════════════════════════════════════════════

-- Students table
create table if not exists students (
  id             text primary key,
  name           text not null,
  email          text not null,
  roll_number    text not null unique,
  department     text,
  semester       text,
  guardian_email  text,
  phone          text,
  face_template  jsonb,          -- stores the number[] face embedding
  created_at     timestamptz default now()
);

-- Attendance records table
create table if not exists attendance_records (
  id          text primary key,
  student_id  text not null references students(id) on delete cascade,
  date        text not null,        -- YYYY-MM-DD
  status      text not null default 'present',
  method      text not null default 'manual',
  confidence  int  not null default 100,
  timestamp   bigint not null,
  created_at  timestamptz default now(),

  unique(student_id, date)           -- one record per student per day
);

-- Index for fast lookups
create index if not exists idx_att_date       on attendance_records(date);
create index if not exists idx_att_student    on attendance_records(student_id);

-- Enable RLS (Row Level Security)
alter table students enable row level security;
alter table attendance_records enable row level security;

-- Allow anon key full access (suitable for local/demo usage)
-- For production, replace with proper auth policies.
create policy "Allow all on students"
  on students for all
  using (true) with check (true);

create policy "Allow all on attendance_records"
  on attendance_records for all
  using (true) with check (true);
