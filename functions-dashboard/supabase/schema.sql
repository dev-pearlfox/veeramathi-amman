-- Sri Veeramathi Amman Thunai: the COMPLETE database, in one file, for a brand-new Supabase project.
-- Run it ONCE: Supabase -> SQL Editor -> New query -> paste everything -> Run. Safe to run again (nothing is dropped).
-- There is no member "type" anywhere: every member is on every function's sheet, except those marked Avoid.
--
-- Access rule: every table has Row Level Security ON, and ONLY signed-in users (the Accounts login and the Dashboard
-- login, created under Authentication -> Users) can read or write. Visitors with just the public key get nothing.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- people (the members)
create table if not exists people (
  id          uuid primary key default gen_random_uuid(),
  name        text,                        -- Tamil name (empty only for an Others member who has just an English name; unique when given)
  name_en     text,                        -- English name (optional)
  place       text,                        -- the house head's place (ஊர்)
  address     jsonb,                       -- Home Address address {door, street, area, town, country, state, district, pincode}, typed in the home-icon popup on the Members page
postal_address jsonb,                    -- Postal Address, same shape, from the second home icon (existing databases: backups/add-postal-address.sql)
  mobile      text,                        -- 10 digits, shown with +91
  dob         date,                        -- date of birth (optional)
  member_no   int,                         -- S.No., set by the pages (highest + 1)
  roll_number int,                         -- permanent Roll No., starts at 1001, set by the pages
  avoid       boolean not null default false,   -- no longer active (hidden from new function sheets)
  member_group text not null default 'thalaikattu',   -- the Members page list: 'thalaikattu' (has a Roll No.) or 'others' (no Roll No.); existing databases: backups/add-member-groups.sql
  family_group int,                        -- the family table (1, 2, 3 ...) a thalaikattu member sits in, as in the printed booklet; NULL for others
  created_at  timestamptz not null default now(),
  constraint people_name_unique unique (name),   -- several empty names are allowed: NULLs never clash
  constraint people_has_a_name check (name is not null or name_en is not null),
  constraint people_member_group_check check (member_group in ('thalaikattu', 'others')),
  constraint people_roll_number_unique unique (roll_number)
);
-- S.No. (member_no) restarts at 1 inside each family table, so it is unique only inside one (an Others member has no table: 0).
create unique index if not exists people_family_no_unique on people (member_group, coalesce(family_group, 0), member_no);

-- ---------------------------------------------------------------- functions (the events)
create table if not exists functions (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  year          int not null,
  santha_amount numeric not null default 1200,   -- the fixed price of one santha, set on the Dashboard
  created_at    timestamptz not null default now(),
  constraint functions_name_year_unique unique (name, year)   -- one function name per year
);

-- ---------------------------------------------------------------- ledger_entries (income per member per function)
create table if not exists ledger_entries (
  id             uuid primary key default gen_random_uuid(),
  function_id    uuid not null references functions(id) on delete cascade,
  person_id      uuid not null references people(id) on delete cascade,
  receipt_no     text not null default '',         -- இரசீது எண் (receipt number)
  santha         numeric not null default 0,       -- "santha" = தலைக்கட்டு வரி (head tax)
  santha_checked boolean not null default false,   -- ticked = paid; counts as the function's santha_amount
  donation       numeric not null default 0,       -- நன்கொடை
  total          numeric not null default 0,       -- santha + donation
  paid           text not null default '',         -- the remark text
  created_at     timestamptz not null default now(),
  unique (function_id, person_id)
);

-- ---------------------------------------------------------------- expense_entries (செலவு: a free list of lines)
-- One row per typed line (a description and an amount), as many as the function needs. Same engine as income_entries,
-- see EXPENSE_KIND in expense-lines.js.
create table if not exists expense_entries (
  id          uuid primary key default gen_random_uuid(),
  function_id uuid not null references functions(id) on delete cascade,
  name        text not null default '',       -- விவரம் (what was bought or paid for)
  amount      numeric not null default 0 check (amount >= 0),
  note        text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists expense_entries_function_idx on expense_entries (function_id);

-- ---------------------------------------------------------------- income_entries (donations, auctions, last year's balance)
-- One row per typed line. `kind` is a key from income-categories.js.
create table if not exists income_entries (
  id          uuid primary key default gen_random_uuid(),
  function_id uuid not null references functions(id) on delete cascade,
  kind        text not null,
  received_on date,
  name        text not null default '',
  name_en     text not null default '',
  phone       text not null default '',
  amount      numeric not null default 0 check (amount >= 0),
  receipt_no  text not null default '',        -- இரசீது எண் (receipt number); used by the donation tabs
  note        text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table income_entries add column if not exists receipt_no text not null default '';   -- for projects created before this column existed
create index if not exists income_entries_function_kind_idx on income_entries (function_id, kind);

-- ---------------------------------------------------------------- materials
-- The Dashboard reads this for its Materials tile and chart. Nothing writes to it; it simply stays empty.
create table if not exists materials (
  id          uuid primary key default gen_random_uuid(),
  function_id uuid not null references functions(id) on delete cascade,
  item_name   text not null,
  quantity    numeric,
  unit        text,
  cost        numeric not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- access rules (signed-in users only)
alter table people          enable row level security;
alter table functions       enable row level security;
alter table ledger_entries  enable row level security;
alter table expense_entries enable row level security;
alter table income_entries  enable row level security;
alter table materials       enable row level security;

drop policy if exists "authenticated all people" on people;
create policy "authenticated all people" on people for all to authenticated using (true) with check (true);

drop policy if exists "authenticated all functions" on functions;
create policy "authenticated all functions" on functions for all to authenticated using (true) with check (true);

drop policy if exists "authenticated all ledger_entries" on ledger_entries;
create policy "authenticated all ledger_entries" on ledger_entries for all to authenticated using (true) with check (true);

-- expense_entries: read, add, change, delete (the x button).
drop policy if exists "authenticated all expense_entries" on expense_entries;
create policy "authenticated all expense_entries" on expense_entries for all to authenticated using (true) with check (true);

-- income_entries: read, add, change, delete (the x button).
drop policy if exists "authenticated select income_entries" on income_entries;
create policy "authenticated select income_entries" on income_entries for select to authenticated using (true);
drop policy if exists "authenticated insert income_entries" on income_entries;
create policy "authenticated insert income_entries" on income_entries for insert to authenticated with check (true);
drop policy if exists "authenticated update income_entries" on income_entries;
create policy "authenticated update income_entries" on income_entries for update to authenticated using (true) with check (true);
drop policy if exists "authenticated delete income_entries" on income_entries;
create policy "authenticated delete income_entries" on income_entries for delete to authenticated using (true);

drop policy if exists "authenticated select materials" on materials;
create policy "authenticated select materials" on materials for select to authenticated using (true);
