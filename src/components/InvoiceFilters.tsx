"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Category, Project, Supplier } from "@/lib/types";

type Props = {
  categories: Category[];
  projects: Project[];
  suppliers: Supplier[];
};

export default function InvoiceFilters({ categories, projects, suppliers }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push("/?" + params.toString());
  }

  const selectClass =
    "w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
      <select
        className={selectClass}
        value={searchParams.get("category") ?? ""}
        onChange={(e) => setParam("category", e.target.value)}
      >
        <option value="">Všechny kategorie</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        className={selectClass}
        value={searchParams.get("project") ?? ""}
        onChange={(e) => setParam("project", e.target.value)}
      >
        <option value="">Všechny projekty</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <select
        className={selectClass}
        value={searchParams.get("supplier") ?? ""}
        onChange={(e) => setParam("supplier", e.target.value)}
      >
        <option value="">Všichni dodavatelé</option>
        {suppliers.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
