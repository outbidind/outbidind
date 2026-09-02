-- OutbidInd MVP business listings

create type public.listing_status as enum (
  'draft',
  'pending_review',
  'approved',
  'rejected',
  'live',
  'closed'
);

create type public.ai_review_status as enum (
  'pending',
  'approved',
  'rejected',
  'needs_review'
);

create table public.business_listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  business_name text not null,
  category text not null,
  description text not null,
  location text not null,
  starting_bid numeric not null check (starting_bid > 0),
  current_bid numeric not null check (current_bid >= starting_bid),
  business_website text,
  additional_information text,
  listing_status public.listing_status not null default 'pending_review',
  ai_review_status public.ai_review_status not null default 'pending',
  admin_reviewed_by uuid references public.profiles(id) on delete set null,
  admin_reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.prepare_business_listing()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.current_bid = new.starting_bid;
  new.listing_status = 'pending_review';
  new.ai_review_status = 'pending';
  new.admin_reviewed_by = null;
  new.admin_reviewed_at = null;
  new.rejection_reason = null;
  return new;
end;
$$;

create trigger business_listings_prepare_insert
before insert on public.business_listings
for each row
execute function public.prepare_business_listing();

create trigger business_listings_set_updated_at
before update on public.business_listings
for each row
execute function public.set_updated_at();

create index business_listings_owner_id_idx
on public.business_listings (owner_id);

create index business_listings_status_created_at_idx
on public.business_listings (listing_status, created_at desc);

alter table public.business_listings enable row level security;

create policy "Users can create their own business listings"
on public.business_listings
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy "Users can view their own business listings"
on public.business_listings
for select
to authenticated
using ((select auth.uid()) = owner_id);