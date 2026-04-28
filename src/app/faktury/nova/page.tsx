import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/server";
import NewInvoiceForm from "./NewInvoiceForm";

export default async function NovaPage() {
  const supabase = await createClient();

  const [categoriesRes, projectsRes, suppliersRes] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase.from("projects").select("*").order("name"),
    supabase.from("suppliers").select("*").order("name"),
  ]);

  return (
    <>
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-1">Nová faktura</h1>
        <p className="text-sm text-slate-500 mb-6">
          Nahraj PDF — AI vyplní údaje, ty doplníš kategorii a projekt.
        </p>
        <NewInvoiceForm
          categories={categoriesRes.data ?? []}
          projects={projectsRes.data ?? []}
          suppliers={suppliersRes.data ?? []}
        />
      </main>
    </>
  );
}
