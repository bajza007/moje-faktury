"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  Category,
  Project,
  Supplier,
  ExtractedInvoiceData,
} from "@/lib/types";

type Props = {
  categories: Category[];
  projects: Project[];
  suppliers: Supplier[];
};

type Phase = "idle" | "processing" | "ready" | "saving";

// SHA-256 hash souboru přes Web Crypto API
async function sha256(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const inputClass =
  "w-full px-3 py-2 border border-slate-300 rounded-md text-sm";
const labelClass = "block text-sm font-medium mb-1";

export default function NewInvoiceForm({
  categories,
  projects,
  suppliers,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [phase, setPhase] = useState<Phase>("idle");
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // PDF info
  const [file, setFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState<string>("");
  const [filePath, setFilePath] = useState<string>("");
  const [extractedData, setExtractedData] = useState<ExtractedInvoiceData | null>(
    null
  );

  // Formulář — předvyplněné z AI
  const [supplierMode, setSupplierMode] = useState<"existing" | "new">("new");
  const [supplierId, setSupplierId] = useState<string>("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierIco, setSupplierIco] = useState("");

  const [categoryId, setCategoryId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [costMonth, setCostMonth] = useState<string>("");

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [variableSymbol, setVariableSymbol] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [amountWithoutVat, setAmountWithoutVat] = useState("");
  const [amountWithVat, setAmountWithVat] = useState("");
  const [currency, setCurrency] = useState("CZK");
  const [note, setNote] = useState("");

  // Podpole podle kategorie
  const [costName, setCostName] = useState("");
  const [serviceDetail, setServiceDetail] = useState("");
  const [adChannel, setAdChannel] = useState("");
  const [personnelSpec, setPersonnelSpec] = useState("");
  const [webAdmin, setWebAdmin] = useState("");
  const [itCostType, setItCostType] = useState("");
  const [ppcCostType, setPpcCostType] = useState("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    setError(null);
    setFile(f);
    setPhase("processing");

    try {
      // 1. Hash + duplicitní check
      setStatusMsg("Počítám hash souboru...");
      const hash = await sha256(f);
      setFileHash(hash);

      setStatusMsg("Kontroluji duplicity...");
      const { data: existing } = await supabase
        .from("invoices")
        .select("id")
        .eq("file_hash", hash)
        .maybeSingle();

      if (existing) {
        setError("Tato faktura už je v systému (stejný PDF soubor).");
        setPhase("idle");
        return;
      }

      // 2. Upload do Storage
      setStatusMsg("Nahrávám PDF do úložiště...");
      const path = `${Date.now()}_${f.name.replace(/[^\w.-]/g, "_")}`;
      const { error: upErr } = await supabase.storage
        .from("invoices")
        .upload(path, f, { contentType: "application/pdf" });

      if (upErr) {
        setError("Chyba při uploadu: " + upErr.message);
        setPhase("idle");
        return;
      }
      setFilePath(path);

      // 3. AI extrakce
      setStatusMsg("AI čte fakturu (10–30 sekund)...");
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/extract", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError("AI extrakce selhala: " + (err.error ?? res.statusText));
        setPhase("idle");
        return;
      }

      const json = await res.json();
      const data: ExtractedInvoiceData = json.data ?? {};
      setExtractedData(data);

      // 4. Předvyplň formulář
      setSupplierName(data.supplier_name ?? "");
      setSupplierIco(data.supplier_ico ?? "");
      setInvoiceNumber(data.invoice_number ?? "");
      setVariableSymbol(data.variable_symbol ?? "");
      setIssueDate(data.issue_date ?? "");
      setDueDate(data.due_date ?? "");
      setAmountWithoutVat(data.amount_without_vat?.toString() ?? "");
      setAmountWithVat(data.amount_with_vat?.toString() ?? "");
      setCurrency(data.currency ?? "CZK");
      setNote(data.description ?? "");

      // Cost month z issue_date (YYYY-MM)
      if (data.issue_date) {
        setCostMonth(data.issue_date.slice(0, 7));
      }

      // Pokud AI dala IČO, zkus najít existujícího dodavatele
      if (data.supplier_ico) {
        const match = suppliers.find((s) => s.ico === data.supplier_ico);
        if (match) {
          setSupplierMode("existing");
          setSupplierId(String(match.id));
          if (match.default_category_id) {
            setCategoryId(String(match.default_category_id));
          }
          if (match.default_project_id) {
            setProjectId(String(match.default_project_id));
          }
        }
      }

      setStatusMsg("");
      setPhase("ready");
    } catch (err) {
      const m = err instanceof Error ? err.message : "Neznámá chyba";
      setError("Chyba: " + m);
      setPhase("idle");
    }
  }

  // Když uživatel zvolí existujícího suppliera → předvyplň jeho default kategorii/projekt
  function handleSupplierSelect(id: string) {
    setSupplierId(id);
    const s = suppliers.find((x) => String(x.id) === id);
    if (s) {
      if (s.default_category_id) {
        setCategoryId(String(s.default_category_id));
      }
      if (s.default_project_id) {
        setProjectId(String(s.default_project_id));
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPhase("saving");

    try {
      // 1. Vyřeš suppliera (existující nebo nový)
      let finalSupplierId: number | null = null;

      if (supplierMode === "existing" && supplierId) {
        finalSupplierId = Number(supplierId);
      } else if (supplierMode === "new" && supplierName.trim()) {
        const { data: newSupp, error: suppErr } = await supabase
          .from("suppliers")
          .insert({
            name: supplierName.trim(),
            ico: supplierIco.trim() || null,
            default_category_id: categoryId ? Number(categoryId) : null,
            default_project_id: projectId ? Number(projectId) : null,
          })
          .select()
          .single();

        if (suppErr) {
          throw new Error("Nepodařilo se vytvořit dodavatele: " + suppErr.message);
        }
        finalSupplierId = newSupp.id;
      }

      // 2. Pokud existující supplier ještě nemá default category/project, ulož je (učení)
      if (
        supplierMode === "existing" &&
        finalSupplierId &&
        (categoryId || projectId)
      ) {
        const supp = suppliers.find((s) => s.id === finalSupplierId);
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
            .eq("id", finalSupplierId);
        }
      }

      // 3. User ID (pro audit)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // 4. Insert faktury
      const { error: invErr } = await supabase.from("invoices").insert({
        user_id: user?.id ?? null,
        supplier_id: finalSupplierId,
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
        file_path: filePath,
        file_hash: fileHash,
        extracted_data: extractedData ?? null,
        invoice_number: invoiceNumber || null,
        variable_symbol: variableSymbol || null,
        issue_date: issueDate || null,
        due_date: dueDate || null,
        amount_without_vat: amountWithoutVat ? Number(amountWithoutVat) : null,
        amount_with_vat: amountWithVat ? Number(amountWithVat) : null,
        currency: currency || "CZK",
        note: note || null,
      });

      if (invErr) {
        if (invErr.code === "23505") {
          throw new Error("Faktura s tímto číslem už od daného dodavatele existuje.");
        }
        throw new Error("Nepodařilo se uložit fakturu: " + invErr.message);
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      const m = err instanceof Error ? err.message : "Neznámá chyba";

      // Cleanup: PDF už je v Storage, ale insert selhal — smaž orphan soubor,
      // aby se nehromadily a aby šel stejný PDF nahrát znovu (file_hash unique).
      if (filePath) {
        try {
          await supabase.storage.from("invoices").remove([filePath]);
          setFilePath("");
        } catch {
          // Pokud cleanup selže, jen to zalogujeme — uživatel už dostane error
          // o důvodu, proč insert nevyšel.
          console.error("Nepodařilo se smazat orphan PDF:", filePath);
        }
      }

      setError(m + " (PDF jsme z úložiště odebrali, můžeš upload zkusit znovu.)");
      // Vrátíme uživatele na začátek — musí nahrát PDF znovu, protože ho nemáme.
      setFile(null);
      setFileHash("");
      setExtractedData(null);
      setPhase("idle");
    }
  }

  // Zvolená kategorie (string podle id)
  const selectedCategory = categories.find(
    (c) => String(c.id) === categoryId
  )?.name;

  return (
    <div className="space-y-6">
      {/* Krok 1: Upload */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="font-semibold mb-3">1. Nahrát PDF</h2>
        <input
          type="file"
          accept="application/pdf"
          disabled={phase === "processing" || phase === "saving"}
          onChange={handleFileChange}
          className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {file && (
          <p className="text-xs text-slate-500 mt-2">
            {file.name} · {(file.size / 1024).toFixed(0)} KB
          </p>
        )}
        {phase === "processing" && (
          <p className="text-sm text-blue-700 mt-3">⏳ {statusMsg}</p>
        )}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md mt-3">
            {error}
          </p>
        )}
      </div>

      {/* Krok 2: Formulář */}
      {phase === "ready" || phase === "saving" ? (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-lg p-5 space-y-5"
        >
          <h2 className="font-semibold">2. Zkontroluj a doplň údaje</h2>
          <p className="text-xs text-slate-500 -mt-3">
            Údaje vyplnila AI z PDF — uprav, pokud něco nesedí.
          </p>

          {/* Dodavatel */}
          <div>
            <label className={labelClass}>Dodavatel</label>
            <div className="flex gap-3 mb-2">
              <label className="text-sm flex items-center gap-1">
                <input
                  type="radio"
                  checked={supplierMode === "new"}
                  onChange={() => setSupplierMode("new")}
                />
                Nový
              </label>
              <label className="text-sm flex items-center gap-1">
                <input
                  type="radio"
                  checked={supplierMode === "existing"}
                  onChange={() => setSupplierMode("existing")}
                />
                Vybrat existujícího
              </label>
            </div>

            {supplierMode === "new" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  className={inputClass}
                  placeholder="Název"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                />
                <input
                  className={inputClass}
                  placeholder="IČO"
                  value={supplierIco}
                  onChange={(e) => setSupplierIco(e.target.value)}
                />
              </div>
            ) : (
              <select
                className={inputClass}
                value={supplierId}
                onChange={(e) => handleSupplierSelect(e.target.value)}
              >
                <option value="">— vyber —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.ico ? `(${s.ico})` : ""}
                  </option>
                ))}
              </select>
            )}
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

          {/* Podpole podle kategorie */}
          {selectedCategory === "Personální" && (
            <div>
              <label className={labelClass}>Specifikace personálního</label>
              <input
                className={inputClass}
                value={personnelSpec}
                onChange={(e) => setPersonnelSpec(e.target.value)}
                placeholder="Mzdy, OON, benefity..."
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
                  placeholder="Google Ads, Facebook..."
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

          {/* Údaje z faktury */}
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

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={phase === "saving"}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md font-medium"
            >
              {phase === "saving" ? "Ukládám..." : "Uložit fakturu"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 rounded-md"
            >
              Zrušit
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
