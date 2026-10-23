-- Initial server-only storage. Clerk remains the source of login and membership.
-- No public/anonymous enrollment or browser database access is enabled here.
begin;

create table public.businesses (
  clerk_organization_id text primary key check (clerk_organization_id ~ '^org_[A-Za-z0-9]+$'),
  name text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.businesses(clerk_organization_id),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (email = lower(btrim(email)) and char_length(email) between 3 and 254),
  phone text not null check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  terms_version text not null check (char_length(terms_version) between 1 and 100),
  terms_accepted_at timestamptz not null,
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now(),
  unique (business_id, email),
  unique (business_id, id)
);
create index customers_business_recent on public.customers (business_id, created_at desc, id desc);
create index customers_business_phone on public.customers (business_id, phone);

create table public.card_designs (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.businesses(clerk_organization_id),
  name text not null check (char_length(name) between 1 and 60),
  reward text not null check (char_length(reward) between 1 and 60),
  visit_goal smallint not null check (visit_goal in (5, 8, 10, 12)),
  background_color text not null check (background_color ~ '^#[A-Fa-f0-9]{6}$'),
  logo_url text,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_by text not null check (created_by ~ '^user_[A-Za-z0-9]+$'),
  created_at timestamptz not null default now(),
  unique (business_id, id)
);
create unique index card_designs_one_active on public.card_designs (business_id) where status = 'active';
create index card_designs_business_recent on public.card_designs (business_id, created_at desc, id desc);

create table public.loyalty_cards (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.businesses(clerk_organization_id),
  customer_id uuid not null,
  design_id uuid not null,
  google_object_id text unique,
  status text not null default 'active' check (status in ('active', 'suspended', 'closed')),
  created_at timestamptz not null default now(),
  foreign key (business_id, customer_id) references public.customers(business_id, id),
  foreign key (business_id, design_id) references public.card_designs(business_id, id),
  unique (business_id, customer_id, design_id),
  unique (business_id, id)
);
create index loyalty_cards_business_recent on public.loyalty_cards (business_id, created_at desc, id desc);

-- No balances/counters are updated by this migration. Visit and redemption writes
-- must be implemented transactionally before enabling their production UI.
create table public.visits (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.businesses(clerk_organization_id),
  card_id uuid not null,
  recorded_by text not null check (recorded_by ~ '^user_[A-Za-z0-9]+$'),
  source text not null check (source in ('dashboard', 'nfc')),
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  foreign key (business_id, card_id) references public.loyalty_cards(business_id, id),
  unique (business_id, idempotency_key)
);
create index visits_business_recent on public.visits (business_id, created_at desc, id desc);
create index visits_card_recent on public.visits (business_id, card_id, created_at desc);

create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.businesses(clerk_organization_id),
  card_id uuid not null,
  recorded_by text not null check (recorded_by ~ '^user_[A-Za-z0-9]+$'),
  reward text not null check (char_length(reward) between 1 and 60),
  visits_spent smallint not null check (visits_spent > 0),
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  foreign key (business_id, card_id) references public.loyalty_cards(business_id, id),
  unique (business_id, idempotency_key)
);
create index redemptions_business_recent on public.redemptions (business_id, created_at desc, id desc);
create index redemptions_card_recent on public.redemptions (business_id, card_id, created_at desc);

alter table public.businesses enable row level security;
alter table public.customers enable row level security;
alter table public.card_designs enable row level security;
alter table public.loyalty_cards enable row level security;
alter table public.visits enable row level security;
alter table public.redemptions enable row level security;

-- No anon/authenticated policies: browsers cannot read or write these tables.
revoke all on public.businesses, public.customers, public.card_designs,
  public.loyalty_cards, public.visits, public.redemptions from public, anon, authenticated;
grant select, insert, update, delete on public.businesses, public.customers,
  public.card_designs, public.loyalty_cards, public.visits, public.redemptions to service_role;

notify pgrst, 'reload schema';
commit;
