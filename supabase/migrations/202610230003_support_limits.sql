begin;
create table public.support_request_limits (
  scope text not null check(scope in ('chat_ip','chat_global','mail_ip')),
  bucket text not null check(bucket ~ '^[a-f0-9]{64}$'),
  window_start timestamptz not null,
  attempts integer not null,
  primary key(scope,bucket)
);
create index support_request_limits_expiry on public.support_request_limits(window_start);
alter table public.support_request_limits enable row level security;
revoke all on public.support_request_limits from public,anon,authenticated;
grant select,insert,update,delete on public.support_request_limits to service_role;
create function public.vc_support_limit(p_bucket text,p_scope text) returns boolean
language plpgsql set search_path='' as $$
declare attempt_count integer; window_length interval; maximum integer;
begin
  if p_bucket !~ '^[a-f0-9]{64}$' then return false; end if;
  case p_scope
    when 'chat_ip' then window_length=interval '10 minutes';maximum=20;
    when 'chat_global' then window_length=interval '1 day';maximum=2000;
    when 'mail_ip' then window_length=interval '1 hour';maximum=5;
    else return false;
  end case;
  delete from public.support_request_limits where window_start<now()-interval '2 days';
  insert into public.support_request_limits as limits(scope,bucket,window_start,attempts) values(p_scope,p_bucket,now(),1)
  on conflict(scope,bucket) do update set
    attempts=case when limits.window_start<now()-window_length then 1 else limits.attempts+1 end,
    window_start=case when limits.window_start<now()-window_length then now() else limits.window_start end
  returning limits.attempts into attempt_count;
  return attempt_count<=maximum;
end $$;
revoke all on function public.vc_support_limit(text,text) from public,anon,authenticated;
grant execute on function public.vc_support_limit(text,text) to service_role;
notify pgrst,'reload schema';
commit;
