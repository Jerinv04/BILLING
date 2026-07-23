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

-- Enable row-level security, then only allow logged-in (authenticated)
-- users to read/write. The app now has a login screen backed by Supabase
-- Auth, and this is what actually enforces it — without this policy,
-- anyone with the public anon key could hit the API directly and bypass
-- the login screen entirely.
alter table app_data enable row level security;

create policy "Allow access for authenticated users"
  on app_data
  for all
  to authenticated
  using (true)
  with check (true);

-- Enable realtime so all open devices see updates instantly.
alter publication supabase_realtime add table app_data;
