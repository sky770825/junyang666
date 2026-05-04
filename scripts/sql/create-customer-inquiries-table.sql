-- Customer inquiries for front-end appointment / LINE inquiry handoff.
-- Run this in Supabase SQL Editor before enabling the customer inquiry form.

create extension if not exists pgcrypto;

create table if not exists public.customer_inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new', 'contacted', 'scheduled', 'closed')),
  name text not null,
  phone text not null,
  preferred_time text,
  message text,
  property_id uuid,
  property_number text,
  property_title text,
  property_price text,
  source_url text,
  source_page text,
  user_agent text
);

create index if not exists customer_inquiries_created_at_idx
  on public.customer_inquiries (created_at desc);

create index if not exists customer_inquiries_status_idx
  on public.customer_inquiries (status);

create or replace function public.set_customer_inquiries_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customer_inquiries_updated_at on public.customer_inquiries;
create trigger customer_inquiries_updated_at
before update on public.customer_inquiries
for each row
execute function public.set_customer_inquiries_updated_at();

alter table public.customer_inquiries enable row level security;

drop policy if exists "public_can_create_customer_inquiries" on public.customer_inquiries;
create policy "public_can_create_customer_inquiries"
on public.customer_inquiries
for insert
to anon, authenticated
with check (true);

grant insert on table public.customer_inquiries to anon, authenticated;

-- Do not add anon/authenticated SELECT policies here.
-- The admin UI reads customer PII only through protected server/API routes
-- using SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS.
