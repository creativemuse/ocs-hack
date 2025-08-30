-- Migration: introduce game_entries and payment_receipts for entry gating
-- Run this in Supabase SQL editor or psql against your project.

create table if not exists game_entries (
  id uuid default gen_random_uuid() primary key,
  session_id text not null,              -- active game session id
  wallet_address text,                   -- if paid or wallet trial
  anon_id text,                          -- if anonymous trial
  is_trial boolean not null default false,
  status text not null default 'verified', -- verified | consumed | pending
  paid_tx_hash text,
  verified_at timestamptz default now(),
  consumed_at timestamptz,
  created_at timestamptz default now(),
  constraint chk_identity check ((wallet_address is not null) or (anon_id is not null))
);

-- One entry per session per identity
create unique index if not exists uq_game_entries_identity_session
on game_entries (session_id, coalesce(wallet_address, anon_id));

-- Optional receipts table for future onramp/onchain verification
create table if not exists payment_receipts (
  id uuid default gen_random_uuid() primary key,
  wallet_address text not null,
  session_id text not null,
  amount decimal(10,2) not null,
  tx_hash text,
  provider text, -- onchain | onramp
  created_at timestamptz default now()
);

alter table if exists game_entries disable row level security;
alter table if exists payment_receipts disable row level security;


