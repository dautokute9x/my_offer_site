-- Giả lập phần nền của Supabase (role, auth, storage) để test migration/RLS bằng psql.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

-- Như Supabase: extension nằm ở schema `extensions`.
create schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;
create extension pg_trgm schema extensions;
create extension unaccent schema extensions;

grant usage on schema public to anon, authenticated, service_role;
-- Supabase cấp ALL trên mọi bảng/hàm/sequence public và dựa vào RLS để chặn.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;

create schema storage;
create table storage.buckets (id text primary key, name text, public bool);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text, name text, owner uuid, created_at timestamptz default now()
);
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated, service_role;
grant all on all tables in schema storage to anon, authenticated, service_role;
