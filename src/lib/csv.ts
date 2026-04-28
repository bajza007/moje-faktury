import type { InvoiceWithRelations } from "./types";

// Escape CSV hodnoty (uvozovky, čárky, nové řádky)
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function invoicesToCsv(invoices: InvoiceWithRelations[]): string {
  const headers = [
    "Měsíc nákladu",
    "Projekt",
    "Kategorie",
    "Dodavatel",
    "IČO",
    "Číslo faktury",
    "Variabilní symbol",
    "Datum vystavení",
    "Datum splatnosti",
    "Částka bez DPH",
    "Částka s DPH",
    "Měna",
    "Název provozního nákladu",
    "Upřesnění služby",
    "Reklamní kanál",
    "Specifikace personálního",
    "Správci webů",
    "Náklad IT",
    "Náklad PPC",
    "Poznámka",
  ];

  const rows = invoices.map((i) => [
    i.cost_month,
    i.project?.name,
    i.category?.name,
    i.supplier?.name,
    i.supplier?.ico,
    i.invoice_number,
    i.variable_symbol,
    i.issue_date,
    i.due_date,
    i.amount_without_vat,
    i.amount_with_vat,
    i.currency,
    i.cost_name,
    i.service_detail,
    i.ad_channel,
    i.personnel_spec,
    i.web_admin,
    i.it_cost_type,
    i.ppc_cost_type,
    i.note,
  ]);

  // BOM pro Excel (UTF-8 detekce)
  const bom = "﻿";
  const headerRow = headers.map(csvCell).join(",");
  const dataRows = rows.map((row) => row.map(csvCell).join(",")).join("\n");

  return bom + headerRow + "\n" + dataRows;
}
