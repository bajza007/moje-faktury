-- ============================================================
-- Moje faktury — initial schema
-- Spusť v Supabase SQL Editor (nejdřív DEV projekt, pak PROD).
-- ============================================================

-- ============================================================
-- TABULKY
-- ============================================================

create table categories (
  id          integer generated always as identity primary key,
  name        text not null,
  created_at  timestamptz not null default now()
);

create table projects (
  id          integer generated always as identity primary key,
  name        text not null,
  created_at  timestamptz not null default now()
);

create table suppliers (
  id                   integer generated always as identity primary key,
  name                 text not null,
  ico                  text,
  default_category_id  integer references categories(id) on delete set null,
  default_project_id   integer references projects(id)   on delete set null,
  created_at           timestamptz not null default now()
);

create table invoices (
  id                  integer generated always as identity primary key,
  user_id             uuid references auth.users(id),
  supplier_id         integer references suppliers(id)  on delete set null,
  category_id         integer references categories(id) on delete set null,
  project_id          integer references projects(id)   on delete set null,

  -- Klasifikace (z Excelu / Google Form)
  cost_month          text,            -- "YYYY-MM"
  cost_name           text,            -- Název provozního nákladu
  service_detail      text,            -- Upřesnění služby
  ad_channel          text,            -- Reklamní kanál
  personnel_spec      text,            -- Specifikace personálního
  web_admin           text,            -- Správci webů
  it_cost_type        text,            -- Náklad IT
  ppc_cost_type       text,            -- Náklad PPC

  -- Soubor + extrakce
  file_path           text,
  file_hash           text unique,     -- SHA256, detekce duplicit
  extracted_data      jsonb,           -- raw odpověď z Gemini

  -- Údaje z faktury
  invoice_number      text,
  variable_symbol     text,
  issue_date          date,
  due_date            date,
  amount_without_vat  numeric(12,2),
  amount_with_vat     numeric(12,2),
  currency            text default 'CZK',
  note                text,

  created_at          timestamptz not null default now()
);

-- Pomocné indexy
create index invoices_supplier_idx  on invoices(supplier_id);
create index invoices_category_idx  on invoices(category_id);
create index invoices_project_idx   on invoices(project_id);
create index invoices_issue_date_idx on invoices(issue_date desc);

-- Soft duplicate check: stejné číslo faktury od stejného dodavatele
create unique index invoices_supplier_number_uniq
  on invoices(supplier_id, invoice_number)
  where supplier_id is not null and invoice_number is not null;

-- ============================================================
-- ROW LEVEL SECURITY
-- Sdílený přístup: kdo je přihlášený, vidí a může psát všechno.
-- Až bude potřeba per-user oddělení, policy se zpřísní na auth.uid() = user_id.
-- ============================================================

alter table categories enable row level security;
alter table projects   enable row level security;
alter table suppliers  enable row level security;
alter table invoices   enable row level security;

create policy "categories_authenticated_all" on categories
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "projects_authenticated_all" on projects
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "suppliers_authenticated_all" on suppliers
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "invoices_authenticated_all" on invoices
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- ============================================================
-- STORAGE POLICIES pro bucket "invoices"
-- Storage má vlastní RLS oddělené od tabulek — bez těchto policy
-- nejde nahrávat/mazat soubory ani s autentizovaným userem.
-- POZN: Bucket "invoices" musíš vytvořit ručně v Supabase dashboardu
-- (Storage → New bucket → název "invoices" → Public bucket: ON).
-- ============================================================

create policy "invoices_storage_authenticated_upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'invoices');

create policy "invoices_storage_authenticated_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'invoices')
  with check (bucket_id = 'invoices');

create policy "invoices_storage_authenticated_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'invoices');

create policy "invoices_storage_public_select"
  on storage.objects for select
  using (bucket_id = 'invoices');

-- ============================================================
-- SEED DATA — předvyplněné kategorie a projekty
-- ============================================================

insert into categories (name) values
  ('Personální'),
  ('Reklamní'),
  ('Provozní'),
  ('Další');

insert into projects (name) values
  ('Administrativa'),
  ('Obchod'),
  ('Expanze'),
  ('Výkonnostní odměny'),
  ('Obchodní provize'),
  ('Sociální sítě'),
  ('Testado'),
  ('ChytrýVýběr'),
  ('Dobrá-víla'),
  ('Světaznalec');
