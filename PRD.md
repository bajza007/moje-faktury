# PRD: Moje faktury

## Problém

Nákladové faktury si firma eviduje ručně v Excelu — každou fakturu přepisuje
do tabulky (dodavatel, IČO, číslo, částka, datum, kategorie, projekt…).
Je to zdlouhavé, často duplicitní (stejná faktura zapsaná dvakrát) a chybí
přehled. Cílem je nahrát PDF a nechat AI vyplnit údaje automaticky, mít
detekci duplicit a pamatovat si zařazení podle dodavatele.

## Cílový uživatel

Dvoučlenný tým v interní s.r.o. (já + kolegyně). Sdílený přístup k jedné
sadě firemních faktur, žádné per-user oddělení dat.

## User Stories

- Jako uživatel chci **nahrát PDF faktury** a nechat AI vyplnit údaje
  (dodavatel, IČO, číslo, datum, částky), abych nemusel přepisovat ručně.
- Jako uživatel chci **přiřadit fakturu ke kategorii a projektu**
  (např. Reklamní → PPC → projekt Testado), abych měl strukturovaný přehled
  nákladů jako v dosavadním Excelu.
- Jako uživatel chci, aby si appka **pamatovala zařazení podle dodavatele**
  (jakmile zařadím fakturu od Googlu jednou, příště to navrhne sama).
- Jako uživatel chci, aby mě appka **upozornila na duplicitní fakturu**
  (stejné PDF nebo stejná kombinace dodavatel + číslo faktury), abych
  jednu fakturu neevidoval dvakrát.
- Jako uživatel chci **exportovat seznam faktur do CSV** pro účetnictví
  a další zpracování.

## MVP Scope

### In scope

- **Auth** — Supabase email + heslo, **zavřená registrace** (účty pre-vytvořené
  v Supabase dashboardu), sdílený přístup mezi přihlášenými.
- **Upload PDF faktury** — drag&drop nebo výběr souboru, ukládání do
  Supabase Storage (bucket `invoices`).
- **AI extrakce přes Gemini** — z PDF vyplní: dodavatel, IČO, číslo faktury,
  variabilní symbol, datum vystavení, datum splatnosti, částka bez DPH,
  částka s DPH, popis. Raw odpověď se uloží do `extracted_data` (jsonb).
- **Klasifikace faktury** — kategorie (Personální / Reklamní / Provozní / Další),
  projekt (Administrativa, Obchod, Expanze, Testado…), podle kategorie pak
  podpole (reklamní kanál, specifikace personálního, IT, PPC, správci webů,
  název provozního nákladu, upřesnění služby, měsíc nákladu, poznámka).
- **Auto-suggest podle dodavatele** — `suppliers.default_category_id` a
  `suppliers.default_project_id` se nastaví při prvním zařazení; příště UI
  předvyplní.
- **Detekce duplicit** — `file_hash` (SHA256 nahraného PDF) `UNIQUE`,
  appka odmítne duplicitní upload. Soft check i podle `(supplier_id, invoice_number)`.
- **Seznam faktur** — filtr podle kategorie, projektu, dodavatele; řazení
  podle data a částky.
- **CSV export** — celý seznam nebo aktuální filtr, sloupce podle původního
  Excelu.

### Out of scope (na backlog)

- Stav zaplaceno / nezaplaceno + tracking splatnosti
- OCR skenovaných PDF (jen text-based)
- Dashboard s grafy (náklady po měsících, top dodavatelé)
- Editor AI výstupu před uložením (pro MVP rovnou uloží, opravíš v detailu)
- Per-user oddělení dat / víc firem
- Schvalovací workflow
- Editoři / audit log úprav (kdo a kdy fakturu změnil)
- Otevřená registrace přes UI

## Externí služby

- **Gemini API** (AI extrakce z PDF) — https://aistudio.google.com → Get API Key
- **Supabase Auth** — vestavěné, žádný další účet
- **Supabase Storage** — vestavěné, vytvoříš bucket `invoices` v dashboardu

## Datový model

Plochý model — všechny sloupce na faktuře, vyplní se relevantní podle kategorie.
Categories a Projects jako lookup tabulky (předvyplněné, dropdown v UI).
`ON DELETE SET NULL` pro mazání kategorie/projektu/dodavatele — faktura zůstane,
jen ztratí referenci.

### Tabulka: invoices

| Sloupec | Typ | Popis |
|---------|-----|-------|
| id | int (PK, identity) | Primární klíč |
| user_id | uuid → auth.users | Kdo nahrál |
| supplier_id | int → suppliers (NULL) | Dodavatel |
| category_id | int → categories (NULL) | Hlavní kategorie nákladu |
| project_id | int → projects (NULL) | Projekt |
| cost_month | text | Měsíc nákladu, formát "YYYY-MM" |
| cost_name | text | Název provozního nákladu |
| service_detail | text | Upřesnění služby |
| ad_channel | text | Reklamní kanál (jen pro Reklamní) |
| personnel_spec | text | Specifikace personálního (jen pro Personální) |
| web_admin | text | Správci webů |
| it_cost_type | text | Náklad IT |
| ppc_cost_type | text | Náklad PPC |
| file_path | text | Cesta v Supabase Storage |
| file_hash | text UNIQUE | SHA256 souboru, detekce duplicit |
| invoice_number | text | Číslo faktury |
| variable_symbol | text | Variabilní symbol |
| issue_date | date | Datum vystavení |
| due_date | date | Datum splatnosti |
| amount_without_vat | numeric(12,2) | Částka bez DPH |
| amount_with_vat | numeric(12,2) | Částka s DPH |
| currency | text default 'CZK' | Měna |
| note | text | Poznámka k nákladu |
| extracted_data | jsonb | Raw odpověď z Gemini (pro debug) |
| created_at | timestamptz default now() | Kdy nahráno |

### Tabulka: suppliers

| Sloupec | Typ | Popis |
|---------|-----|-------|
| id | int (PK, identity) | Primární klíč |
| name | text | Název dodavatele |
| ico | text | IČO |
| default_category_id | int → categories (NULL) | Učení — auto-suggest kategorie |
| default_project_id | int → projects (NULL) | Učení — auto-suggest projektu |
| created_at | timestamptz default now() | |

### Tabulka: categories

| Sloupec | Typ | Popis |
|---------|-----|-------|
| id | int (PK, identity) | Primární klíč |
| name | text | Personální / Reklamní / Provozní / Další |
| created_at | timestamptz default now() | |

### Tabulka: projects

| Sloupec | Typ | Popis |
|---------|-----|-------|
| id | int (PK, identity) | Primární klíč |
| name | text | Administrativa, Obchod, Expanze, Testado… |
| created_at | timestamptz default now() | |

## SQL pro Supabase

Funkční SQL je v `migrations/001_initial.sql`. Spusť ho **nejdřív v DEV
projektu** (lokální vývoj), později i v **PROD projektu** při deployi.

RLS policy: protože je to interní app pro celou firmu (sdílený přístup),
policy říká „kdo je přihlášený, vidí a může psát všechno" — `auth.uid() IS NOT NULL`.
Není to per-user oddělení — to bychom udělali kdybychom chtěli každému
uživateli jeho vlastní data.

## Diagram vztahů

(viz GitHub Issue — Mermaid se renderuje nativně)
