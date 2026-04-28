"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  Category,
  Project,
  Supplier,
  InvoiceWithRelations,
} from "@/lib/types";

type Props = {
  invoice: InvoiceWithRelations;
  categories: Category[];
  projects: Project[];
  suppliers: Supplier[];
};

const inputClass =
  "w-full px-3 py-2 border border-slate-300 rounded-md text-sm";
const labelClass = "block text-sm font-medium mb-1";

export default function EditInvoiceForm({
  invoice,
  categories,
  projects,
  suppliers,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [supplierId, setSupplierId] = useState<string>(
    invoice.supplier_id ? String(invoice.supplier_id) : ""
  );
  const [categoryId, setCategoryId] = useState<string>(
    invoice.category_id ? String(invoice.category_id) : ""
  );
  const [projectId, setProjectId] = useState<string>(
    invoice.project_id ? String(invoice.project_id) : ""
  );
  const [costMonth, setCostMonth] = useState(invoice.cost_month ?? "");

  const [invoiceNumber, setInvoiceNumber] = useState(invoice.invoice_number ?? "");
  const [variableSymbol, setVariableSymbol] = useState(
    invoice.variable_symbol ?? ""
  );
  const [issueDate, setIssueDate] = useState(invoice.issue_date ?? "");
  const [dueDate, setDueDate] = useState(invoice.due_date ?? "");
  const [amountWithoutVat, setAmountWithoutVat] = useState(
    invoice.amount_without_vat?.toString() ?? ""
  );
  const [amountWithVat, setAmountWithVat] = useState(
    invoice.amount_with_vat?.toString() ?? ""
  );
  const [currency, setCurrency] = useState(invoice.currency ?? "CZK");
  const [note, setNote] = useState(invoice.note ?? "");

  const [costName, setCostName] = useState(invoice.cost_name ?? "");
  const [serviceDetail, setServiceDetail] = useState(invoice.service_detail ?? "");
  const [adChannel, setAdChannel] = useState(invoice.ad_channel ?? "");
  const [personnelSpec, setPersonnelSpec] = useState(
    invoice.personnel_spec ?? ""
  );
  const [webAdmin, setWebAdmin] = useState(invoice.web_admin ?? "");
  const [itCostType, setItCostType] = useState(invoice.it_cost_type ?? "");
  const [ppcCostType, setPpcCostType] = useState(invoice.ppc_cost_type ?? "");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCategory = categories.find(
    (c) => String(c.id) === categoryId
  )?.name;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error: upErr } = await supabase
      .from("invoices")
      .update({
        supplier_id: supplierId ? Number(supplierId) : null,
        category_id: categoryId ? Number(categoryId) : null,
        project_id: projectId ? Number(projectId) : null,
        cost_month: costMonth || null,
        cost_name: costName || null,
        service_detail: serviceDetail || null,
        ad_channel: adChannel || null,
        personnel_spec: personnelSpec || null,
        web_admin: webAdmin || null,
        it_cost_type: itCostType || null,
        ppc_cost_type: ppcCostType || null,
        invoice_number: invoiceNumber || null,
        variable_symbol: variableSymbol || null,
        issue_date: issueDate || null,
        due_date: dueDate || null,
        amount_without_vat: amountWithoutVat ? Number(amountWithoutVat) : null,
        amount_with_vat: amountWithVat ? Number(amountWithVat) : null,
        currency: currency || "CZK",
        note: note || null,
      })
      .eq("id", invoice.id);

    if (upErr) {
      setError("Uložení selhalo: " + upErr.message);
      setSaving(false);
      return;
    }

    // Pokud má supplier prázdný default, ulož aktuální zařazení (učení)
    if (supplierId) {
      const supp = suppliers.find((s) => String(s.id) === supplierId);
      const updates: Record<string, number> = {};
      if (categoryId && !supp?.default_category_id) {
        updates.default_category_id = Number(categoryId);
      }
      if (projectId && !supp?.default_project_id) {
        updates.default_project_id = Number(projectId);
      }
      if (Object.keys(updates).length > 0) {
        await supabase
          .from("suppliers")
          .update(updates)
          .eq("id", Number(supplierId));
      }
    }

    router.push("/");
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Opravdu smazat tuto fakturu? PDF zůstane v úložišti.")) return;
    setDeleting(true);

    // Smaž PDF z úložiště
    if (invoice.file_path) {
      await supabase.storage.from("invoices").remove([invoice.file_path]);
    }

    const { error: delErr } = await supabase
      .from("invoices")
      .delete()
      .eq("id", invoice.id);

    if (delErr) {
      setError("Smazání selhalo: " + delErr.message);
      setDeleting(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSave}
      className="bg-white border border-slate-200 rounded-lg p-5 space-y-5"
    >
      {/* Dodavatel */}
      <div>
        <label className={labelClass}>Dodavatel</label>
        <select
          className={inputClass}
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
        >
          <option value="">— bez dodavatele —</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} {s.ico ? `(${s.ico})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Klasifikace */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Kategorie</label>
          <select
            className={inputClass}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">— vyber —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Projekt</label>
          <select
            className={inputClass}
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">— vyber —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Měsíc nákladu</label>
          <input
            type="month"
            className={inputClass}
            value={costMonth}
            onChange={(e) => setCostMonth(e.target.value)}
          />
        </div>
      </div>

      {selectedCategory === "Personální" && (
        <div>
          <label className={labelClass}>Specifikace personálního</label>
          <input
            className={inputClass}
            value={personnelSpec}
            onChange={(e) => setPersonnelSpec(e.target.value)}
          />
        </div>
      )}

      {selectedCategory === "Reklamní" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Reklamní kanál</label>
            <input
              className={inputClass}
              value={adChannel}
              onChange={(e) => setAdChannel(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Náklad PPC</label>
            <input
              className={inputClass}
              value={ppcCostType}
              onChange={(e) => setPpcCostType(e.target.value)}
            />
          </div>
        </div>
      )}

      {selectedCategory === "Provozní" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className={labelClass}>Název provozního nákladu</label>
            <input
              className={inputClass}
              value={costName}
              onChange={(e) => setCostName(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Náklad IT</label>
            <input
              className={inputClass}
              value={itCostType}
              onChange={(e) => setItCostType(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Správci webů</label>
            <input
              className={inputClass}
              value={webAdmin}
              onChange={(e) => setWebAdmin(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Upřesnění služby</label>
            <input
              className={inputClass}
              value={serviceDetail}
              onChange={(e) => setServiceDetail(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Číslo faktury</label>
          <input
            className={inputClass}
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Variabilní symbol</label>
          <input
            className={inputClass}
            value={variableSymbol}
            onChange={(e) => setVariableSymbol(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Datum vystavení</label>
          <input
            type="date"
            className={inputClass}
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Datum splatnosti</label>
          <input
            type="date"
            className={inputClass}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Částka bez DPH</label>
          <input
            type="number"
            step="0.01"
            className={inputClass}
            value={amountWithoutVat}
            onChange={(e) => setAmountWithoutVat(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Částka s DPH</label>
          <input
            type="number"
            step="0.01"
            className={inputClass}
            value={amountWithVat}
            onChange={(e) => setAmountWithVat(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Měna</label>
          <input
            className={inputClass}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Poznámka</label>
        <textarea
          className={inputClass}
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3 pt-2 justify-between">
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md font-medium"
          >
            {saving ? "Ukládám..." : "Uložit změny"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 rounded-md"
          >
            Zpět
          </button>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="px-4 py-2 bg-white border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50 rounded-md"
        >
          {deleting ? "Mažu..." : "Smazat"}
        </button>
      </div>
    </form>
  );
}
