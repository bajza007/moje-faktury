"use client";

import { invoicesToCsv } from "@/lib/csv";
import type { InvoiceWithRelations } from "@/lib/types";

export default function ExportCsvButton({
  invoices,
}: {
  invoices: InvoiceWithRelations[];
}) {
  function handleExport() {
    const csv = invoicesToCsv(invoices);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `faktury_${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      disabled={invoices.length === 0}
      className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50 rounded-md text-sm font-medium"
    >
      📥 Export CSV
    </button>
  );
}
