do $$
begin
  if auth.uid() is not null then raise exception 'auth.uid() phải null khi chưa set claim'; end if;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
  if auth.uid() <> '00000000-0000-0000-0000-000000000001'::uuid then raise exception 'auth.uid() sai'; end if;
  perform set_config('request.jwt.claim.sub', '', false);
  if auth.uid() is not null then raise exception 'claim rỗng phải trả null'; end if;
  if not exists (select 1 from pg_roles where rolname='service_role' and rolbypassrls) then
    raise exception 'service_role thiếu bypassrls'; end if;
  -- Cấp quyền như Supabase: RLS test không được "đạt" chỉ vì thiếu GRANT.
  create table public.__priv_probe (id int);
  if not has_table_privilege('anon', 'public.__priv_probe', 'INSERT')
     or not has_table_privilege('authenticated', 'public.__priv_probe', 'SELECT') then
    raise exception 'default privileges của public không giống Supabase'; end if;
  drop table public.__priv_probe;
end $$;
