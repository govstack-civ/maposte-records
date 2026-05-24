-- Run this in Supabase SQL Editor to fix RLS / grant issues
-- Safe to run multiple times

-- 1. Grant schema + table access to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 2. For prototype: disable RLS on all tables (avoids policy complexity)
ALTER TABLE citizens            DISABLE ROW LEVEL SECURITY;
ALTER TABLE academic_records    DISABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records     DISABLE ROW LEVEL SECURITY;
ALTER TABLE credentials         DISABLE ROW LEVEL SECURITY;
ALTER TABLE sharing_events      DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log           DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments            DISABLE ROW LEVEL SECURITY;

-- 3. Drop any conflicting policies left over from schema.sql
DROP POLICY IF EXISTS "Allow all citizens"          ON citizens;
DROP POLICY IF EXISTS "Allow all academic_records"  ON academic_records;
DROP POLICY IF EXISTS "Allow all consent_records"   ON consent_records;
DROP POLICY IF EXISTS "Allow all credentials"       ON credentials;
DROP POLICY IF EXISTS "Allow all sharing_events"    ON sharing_events;
DROP POLICY IF EXISTS "Allow all audit_log"         ON audit_log;
DROP POLICY IF EXISTS "Allow all payments"          ON payments;
