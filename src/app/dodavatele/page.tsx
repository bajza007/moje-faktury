import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/server";
import SuppliersTable from "./SuppliersTable";

export default async function DodavatelePage() {
  const supabase = await createClient();

  const [suppliersRes, categoriesRes, projectsRes] = await Promise.all([
    supabase.from("suppliers").select("*").order("name"),
    supabase.from("categories").select("*").order("name"),
    supabase.from("projects").select("*").order("name"),
  ]);

  return (
    <>
      <Navigation />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-1">Dodavatelé</h1>
        <p className="text-sm text-slate-500 mb-6">
          Defaultní zařazení (kategorie + projekt) si appka pamatuje a předvyplní
          při další faktuře od stejného dodavatele.
        </p>
        <SuppliersTable
          suppliers={suppliersRes.data ?? []}
          categories={categoriesRes.data ?? []}
          projects={projectsRes.data ?? []}
        />
      </main>
    </>
  );
}
