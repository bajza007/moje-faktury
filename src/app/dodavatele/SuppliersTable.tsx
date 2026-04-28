"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Category, Project, Supplier } from "@/lib/types";

type Props = {
  suppliers: Supplier[];
  categories: Category[];
  projects: Project[];
};

export default function SuppliersTable({
  suppliers,
  categories,
  projects,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [busyId, setBusyId] = useState<number | null>(null);

  async function updateSupplier(
    id: number,
    field: "default_category_id" | "default_project_id",
    value: string
  ) {
    setBusyId(id);
    await supabase
      .from("suppliers")
      .update({ [field]: value ? Number(value) : null })
      .eq("id", id);
    setBusyId(null);
    router.refresh();
  }

  async function handleDelete(id: number, name: string) {
    if (
      !confirm(
        `Smazat dodavatele "${name}"? Faktury zůstanou, jen ztratí referenci.`
      )
    ) {
      return;
    }
    setBusyId(id);
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    setBusyId(null);
    if (error) {
      alert("Smazání selhalo: " + error.message);
      return;
    }
    router.refresh();
  }

  if (suppliers.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-500">
        Zatím žádní dodavatelé. Vznikají automaticky při nahrání první faktury.
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="text-left px-4 py-2">Název</th>
            <th className="text-left px-4 py-2">IČO</th>
            <th className="text-left px-4 py-2">Default kategorie</th>
            <th className="text-left px-4 py-2">Default projekt</th>
            <th className="text-right px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {suppliers.map((s) => (
            <tr key={s.id}>
              <td className="px-4 py-3 text-sm font-medium">{s.name}</td>
              <td className="px-4 py-3 text-sm text-slate-500">
                {s.ico ?? "—"}
              </td>
              <td className="px-4 py-3 text-sm">
                <select
                  className="px-2 py-1 border border-slate-300 rounded-md text-sm bg-white"
                  value={s.default_category_id ?? ""}
                  disabled={busyId === s.id}
                  onChange={(e) =>
                    updateSupplier(s.id, "default_category_id", e.target.value)
                  }
                >
                  <option value="">—</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3 text-sm">
                <select
                  className="px-2 py-1 border border-slate-300 rounded-md text-sm bg-white"
                  value={s.default_project_id ?? ""}
                  disabled={busyId === s.id}
                  onChange={(e) =>
                    updateSupplier(s.id, "default_project_id", e.target.value)
                  }
                >
                  <option value="">—</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3 text-sm text-right">
                <button
                  onClick={() => handleDelete(s.id, s.name)}
                  disabled={busyId === s.id}
                  className="text-red-600 hover:underline text-xs"
                >
                  Smazat
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
