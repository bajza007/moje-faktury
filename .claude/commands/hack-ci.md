---
description: "9. [ADVANCED] Nastaví GitHub Actions — lint + typecheck + test + build na každém pushi."
---

Jsi CI agent — nastavíš GitHub Actions pipeline, která při každém pushi a PR
spustí lint, typecheck, testy a build. Po tomhle kroku má uživatel "zelený zámek"
u každého commitu.

## Přizpůsobení úrovni

Přečti `.participant-level` (default `medior`). Matice v CLAUDE.md.

**Agent-specific dopady:**

- **junior:** Vysvětli co je CI pipeline jednou větou ("skript, co při každém
  pushi sám ověří, že kód stále funguje") a co každý krok dělá. Secrets na
  GitHubu projdi screenshot-stylem ("klikni Settings → Secrets → Actions →
  New repository secret"). Ověř, že pipeline zezelenala.
- **medior:** Současná šablona.
- **senior:** Přeskoč co-je-CI. Rovnou nabídni volby nad rámec defaultu:
  matrix (Node 18+20+22)? Cache beyond npm (Next.js build cache)? Deploy
  preview na branch? Nepřidávej automaticky — jen nabídni.

Pro všechny: pokud lint/typecheck selže lokálně, **nedělej push** dokud to
neopravíš. První běh CI má být zelený — špatná první zkušenost odradí.

## Jak postupuješ

### 1. Zjisti stav

Zkontroluj:
- Existuje `package.json`? (pokud ne → "nejdřív spusť /hack-scaffold")
- Je to projekt propojený s GitHubem? Koukni na `git remote -v`.
  Pokud ne: "Nejdřív spusť /hack-deploy — potřebuju, aby repo bylo na GitHubu."
- Existuje `vitest.config.ts`? Pokud ano → přidáme `npm test` do pipeline.
  Pokud ne → upozorni: "Testy nemáš. Můžu CI nastavit i bez nich (lint + build),
  nebo si nejdřív spusť /hack-test."

### 2. Zkontroluj scripts v package.json

Měly by existovat:
- `lint` (typicky už je z create-next-app: `next lint`)
- `build` (typicky už je: `next build`)
- `typecheck` (pravděpodobně není — přidej: `tsc --noEmit`)
- `test` (pokud je Vitest, přidej `vitest run`)

Uprav `package.json`, pokud chybí.

### 3. Vytvoř workflow

Založ `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Typecheck
        run: npm run typecheck

      - name: Test
        run: npm test
        if: hashFiles('vitest.config.ts') != ''

      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }}
```

### 4. Nastavení secrets na GitHubu

Řekni uživateli, že build potřebuje stejné env proměnné, co má na Vercelu.
Navigace: `github.com/<user>/<repo>/settings/secrets/actions` → New repository secret.
Přidat dvě:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Hodnoty najde v `.env.local`.

Nabídni: "Můžu otevřít tu stránku v prohlížeči?" → pokud ano, `gh` CLI nebo
prostě vypsat URL.

### 5. Commit + push

```bash
git add .github/workflows/ci.yml package.json
git commit -m "ci: add GitHub Actions pipeline"
git push
```

### 6. Ukaž výsledek

Řekni: "Jdi na github.com/<user>/<repo>/actions — měl bys vidět běžící pipeline.
Pokud je zelená, máš CI. Od teď každý push spustí tuhle kontrolu; každý PR
stejně tak a bez zelené se nemerguje."

## Pravidla

- Pokud nějaký check padne (třeba `npm run lint` lokálně hází chyby), **nepouštěj
  workflow**, dokud to neopravíš. První zkušenost s CI má být úspěch.
- `typecheck` je často bolestivý — projekt může mít existující `any` a implicit
  types. V takovém případě buď (a) rychle opravit, nebo (b) dát `tsc --noEmit` s
  mírnějším configem. Řekni uživateli volbu.
- Pokud `vitest.config.ts` neexistuje, krok `Test` sám přeskočí díky `if`.
- **Nepoužívej** `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` v CI — tam patří jen
  anon key.
- Mluvíš česky.

## Proč tohle ve workshopu stojí za to

Ukazuje princip "shift-left" — chyby chceš chytit před produkcí, ne v ní. A
účastník uvidí, že CI/CD není "jen pro seniory" — i začátečník si to nastaví za
5 minut přes jeden command.
