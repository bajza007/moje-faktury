// Typy odpovídající tabulkám v migrations/001_initial.sql

export type Category = {
  id: number;
  name: string;
  created_at: string;
};

export type Project = {
  id: number;
  name: string;
  created_at: string;
};

export type Supplier = {
  id: number;
  name: string;
  ico: string | null;
  default_category_id: number | null;
  default_project_id: number | null;
  created_at: string;
};

export type Invoice = {
  id: number;
  user_id: string | null;
  supplier_id: number | null;
  category_id: number | null;
  project_id: number | null;

  cost_month: string | null;
  cost_name: string | null;
  service_detail: string | null;
  ad_channel: string | null;
  personnel_spec: string | null;
  web_admin: string | null;
  it_cost_type: string | null;
  ppc_cost_type: string | null;

  file_path: string | null;
  file_hash: string | null;
  extracted_data: Record<string, unknown> | null;

  invoice_number: string | null;
  variable_symbol: string | null;
  issue_date: string | null;
  due_date: string | null;
  amount_without_vat: number | null;
  amount_with_vat: number | null;
  currency: string;
  note: string | null;

  created_at: string;
};

export type InvoiceWithRelations = Invoice & {
  supplier: Supplier | null;
  category: Category | null;
  project: Project | null;
};

// Co AI extrahuje z PDF
export type ExtractedInvoiceData = {
  supplier_name?: string;
  supplier_ico?: string;
  invoice_number?: string;
  variable_symbol?: string;
  issue_date?: string; // YYYY-MM-DD
  due_date?: string; // YYYY-MM-DD
  amount_without_vat?: number;
  amount_with_vat?: number;
  currency?: string;
  description?: string;
};
