-- Run this once in your Supabase project's SQL Editor
-- (Dashboard > SQL Editor > New query > paste this in > Run)

-- One table stores everything as key/value JSON, matching what the app
-- already expects: "shop:settings", "shop:products", "shop:customers",
-- "shop:invoices", "shop:invoice-counter".
create table if not exists app_data (
  key text primary key,
  value jsonb,
  updated_at timestamptz default now()
);

-- Enable row-level security, then allow the app's public (anon) key to
-- read and write. This is fine for a single small shop's private tool
-- where only people with your app's URL will use it — just don't share
-- your Supabase URL/key publicly beyond that.
alter table app_data enable row level security;

create policy "Allow all access for anon key"
  on app_data
  for all
  to anon
  using (true)
  with check (true);

-- Enable realtime so all open devices see updates instantly.
alter publication supabase_realtime add table app_data;
