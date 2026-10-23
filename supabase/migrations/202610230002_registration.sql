begin;
alter table public.businesses add column enrollment_slug uuid not null default gen_random_uuid() unique;
alter table public.card_designs add column terms_url text;
alter table public.card_designs add column privacy_url text;
alter table public.card_designs add column terms_version text;
alter table public.card_designs add column revision integer not null default 1;
alter table public.card_designs add column published_at timestamptz;
create unique index card_designs_one_draft on public.card_designs(business_id) where status='draft';
alter table public.card_designs add constraint active_design_has_documents check (
  status <> 'active' or (terms_url is not null and privacy_url is not null and terms_url like 'https://%' and privacy_url like 'https://%' and
  terms_version is not null and char_length(terms_version) between 1 and 100 and published_at is not null)
);
alter table public.loyalty_cards add column enrollment_token_hash text unique;
alter table public.loyalty_cards add column registration_fingerprint text;

create function public.vc_save_design(p_business text, p_user text, p_design jsonb, p_revision integer)
returns jsonb language plpgsql set search_path = '' as $$
declare d public.card_designs;
begin
  perform 1 from public.businesses where clerk_organization_id=p_business for update;
  if not found then raise exception 'VC_NOT_FOUND'; end if;
  select * into d from public.card_designs where business_id=p_business and status='draft';
  if found then
    if p_revision is distinct from d.revision then raise exception 'VC_CONFLICT'; end if;
    update public.card_designs set name=p_design->>'business', reward=p_design->>'reward',
      visit_goal=(p_design->>'goal')::smallint, background_color=p_design->>'color',
      logo_url=p_design->>'logoUrl', terms_url=p_design->>'termsUrl', privacy_url=p_design->>'privacyUrl',
      terms_version=p_design->>'termsVersion', revision=revision+1
      where id=d.id returning * into d;
  else
    insert into public.card_designs(business_id,name,reward,visit_goal,background_color,logo_url,created_by,terms_url,privacy_url,terms_version)
    values (p_business,p_design->>'business',p_design->>'reward',(p_design->>'goal')::smallint,
      p_design->>'color',p_design->>'logoUrl',p_user,p_design->>'termsUrl',p_design->>'privacyUrl',p_design->>'termsVersion')
    returning * into d;
  end if;
  return to_jsonb(d);
end $$;

create function public.vc_publish_design(p_business text, p_design uuid, p_revision integer)
returns jsonb language plpgsql set search_path = '' as $$
declare d public.card_designs;
begin
  perform 1 from public.businesses where clerk_organization_id=p_business for update;
  select * into d from public.card_designs where business_id=p_business and id=p_design;
  if not found then raise exception 'VC_NOT_FOUND'; end if;
  if d.revision is distinct from p_revision or d.status not in ('draft','active') then raise exception 'VC_CONFLICT'; end if;
  if d.status='active' then return to_jsonb(d); end if;
  if coalesce(d.terms_url,'') not like 'https://%' or coalesce(d.privacy_url,'') not like 'https://%' or
     coalesce(d.terms_version,'')='' then raise exception 'VC_DOCUMENTS_REQUIRED'; end if;
  update public.card_designs set status='archived' where business_id=p_business and status='active';
  update public.card_designs set status='active',published_at=now() where id=d.id returning * into d;
  return to_jsonb(d);
end $$;

create table public.enrollment_limits (
  bucket text primary key, window_start timestamptz not null, attempts integer not null
);
create index enrollment_limits_expiry on public.enrollment_limits(window_start);
alter table public.enrollment_limits enable row level security;
revoke all on public.enrollment_limits from public, anon, authenticated;
grant select,insert,update,delete on public.enrollment_limits to service_role;
create function public.vc_enrollment_rate(p_bucket text) returns boolean
language plpgsql set search_path = '' as $$
declare attempts integer;
begin
  if p_bucket !~ '^[a-f0-9]{64}$' then return false; end if;
  delete from public.enrollment_limits where window_start < now()-interval '1 day';
  insert into public.enrollment_limits as limits(bucket,window_start,attempts) values(p_bucket,now(),1)
  on conflict(bucket) do update set
    attempts=case when limits.window_start < now()-interval '10 minutes' then 1 else limits.attempts+1 end,
    window_start=case when limits.window_start < now()-interval '10 minutes' then now() else limits.window_start end
  returning limits.attempts into attempts;
  return attempts <= 30;
end $$;

create function public.vc_enroll(p_slug uuid, p_token text, p_fingerprint text, p_design uuid,
  p_name text,p_email text,p_phone text,p_terms text)
returns jsonb language plpgsql set search_path = '' as $$
declare b public.businesses; d public.card_designs; c public.customers; card public.loyalty_cards;
begin
  if p_token !~ '^[a-f0-9]{64}$' or p_fingerprint !~ '^[a-f0-9]{64}$' then raise exception 'VC_INVALID'; end if;
  -- Serialize publishing and enrollment so consent always refers to one version.
  select * into b from public.businesses where enrollment_slug=p_slug for update;
  if not found then raise exception 'VC_NOT_FOUND'; end if;
  select * into card from public.loyalty_cards where business_id=b.clerk_organization_id and enrollment_token_hash=p_token;
  if found then
    if card.registration_fingerprint<>p_fingerprint then raise exception 'VC_CONFLICT'; end if;
    select * into c from public.customers where id=card.customer_id and business_id=card.business_id;
    select * into d from public.card_designs where id=card.design_id and business_id=card.business_id;
  else
    select * into d from public.card_designs where business_id=b.clerk_organization_id and status='active';
    if not found then raise exception 'VC_NOT_FOUND'; end if;
    if d.id<>p_design or d.terms_version<>p_terms then raise exception 'VC_PROGRAM_CHANGED'; end if;
    if exists(select 1 from public.customers where business_id=b.clerk_organization_id and email=p_email) then
      raise exception 'VC_ALREADY_REGISTERED';
    end if;
    insert into public.customers(business_id,name,email,phone,terms_version,terms_accepted_at)
    values(b.clerk_organization_id,p_name,p_email,p_phone,p_terms,now()) returning * into c;
    insert into public.loyalty_cards(business_id,customer_id,design_id,enrollment_token_hash,registration_fingerprint)
    values(b.clerk_organization_id,c.id,d.id,p_token,p_fingerprint) returning * into card;
  end if;
  return jsonb_build_object('cardId',card.id,'businessId',b.clerk_organization_id,'name',c.name,'design',to_jsonb(d));
end $$;

revoke all on function public.vc_save_design(text,text,jsonb,integer),public.vc_publish_design(text,uuid,integer),
  public.vc_enrollment_rate(text),public.vc_enroll(uuid,text,text,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.vc_save_design(text,text,jsonb,integer),public.vc_publish_design(text,uuid,integer),
  public.vc_enrollment_rate(text),public.vc_enroll(uuid,text,text,uuid,text,text,text,text) to service_role;
notify pgrst,'reload schema';
commit;
