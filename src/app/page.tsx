import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Navigation from "@/components/Navigation";
import InvoiceFilters from "@/components/InvoiceFilters";
import ExportCsvButton from "@/components/ExportCsvButton";
import type { InvoiceWithRelations } from "@/lib/types";

type SearchParams = Promise<{
  category?: string;
  project?: string;
  supplier?: string;
}>;

function formatAmount(amount: number | null, currency: string) {
  if (amount === null) return "—";
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("cs-CZ");
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // Lookup data pro filtry a zobrazení
  const [categoriesRes, projectsRes, suppliersRes] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase.from("projects").select("*").order("name"),
    supabase.from("suppliers").select("*").order("name"),
  ]);

  const categories = categoriesRes.data ?? [];
  const projects = projectsRes.data ?? [];
  const suppliers = suppliersRes.data ?? [];

  // Sestav dotaz na faktury s filtry
  let query = supabase
    .from("invoices")
    .select(
      "*, supplier:suppliers(*), category:categories(*), project:projects(*)"
    )
    .order("issue_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (params.category) query = query.eq("category_id", Number(params.category));
  if (params.project) query = query.eq("project_id", Number(params.project));
  if (params.supplier) query = query.eq("supplier_id", Number(params.supplier));

  const { data: invoices } = await query;
  const list = (invoices ?? []) as InvoiceWithRelations[];

  const totalWithVat = list.reduce(
    (sum, i) => sum + (i.amount_with_vat ?? 0),
    0
  );

  return (
    <>
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold">Faktury</h1>
            <p className="text-sm text-slate-500">
              {list.length}{" "}
              {list.length === 1 ? "faktura" : list.length < 5 ? "faktury" : "faktur"}{" "}
              · celkem {formatAmount(totalWithVat, "CZK")} (s DPH)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ExportCsvButton invoices={list} />
            <Link
              href="/faktury/nova"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
            >
              + Nová faktura
            </Link>
          </div>
        </div>

        <InvoiceFilters
          categories={categories}
          projects={projects}
          suppliers={suppliers}
        />

        {list.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
            <p className="text-slate-500 mb-4">Zatím nemáš žádné faktury.</p>
            <Link
              href="/faktury/nova"
              className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
            >
              Nahrát první fakturu
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            {/* Mobile: karty */}
            <div className="sm:hidden divide-y divide-slate-200">
              {list.map((i) => (
                <Link
                  key={i.id}
                  href={`/faktury/${i.id}`}
                  className="block p-4 hover:bg-slate-50"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {i.supplier?.name ?? "—"}
                      </div>
                      <div className="text-sm text-slate-500 truncate">
                        {i.invoice_number ?? "bez čísla"} · {formatDate(i.issue_date)}
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-1">
                        {i.category && (
                          <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                            {i.category.name}
                          </span>
                        )}
                        {i.project && (
                          <span className="inline-block px-2 py-0.5 bg-purple-50 text-purple-700 rounded">
                            {i.project.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="font-semibold text-right shrink-0">
                      {formatAmount(i.amount_with_vat, i.currency)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop: tabulka */}
            <table className="hidden sm:table w-full">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2">Datum</th>
                  <th className="text-left px-4 py-2">Dodavatel</th>
                  <th className="text-left px-4 py-2">Číslo</th>
                  <th className="text-left px-4 py-2">Kategorie</th>
                  <th className="text-left px-4 py-2">Projekt</th>
                  <th className="text-right px-4 py-2">Částka</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {list.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm">
                      <Link href={`/faktury/${i.id}`} className="block">
                        {formatDate(i.issue_date)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      <Link href={`/faktury/${i.id}`} className="block">
                        {i.supplier?.name ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      <Link href={`/faktury/${i.id}`} className="block">
                        {i.invoice_number ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link href={`/faktury/${i.id}`} className="block">
                        {i.category && (
                          <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                            {i.category.name}
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link href={`/faktury/${i.id}`} className="block">
                        {i.project && (
                          <span className="inline-block px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">
                            {i.project.name}
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold">
                      <Link href={`/faktury/${i.id}`} className="block">
                        {formatAmount(i.amount_with_vat, i.currency)}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
