import { notFound } from "next/navigation";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/server";
import EditInvoiceForm from "./EditInvoiceForm";
import type { InvoiceWithRelations } from "@/lib/types";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [invoiceRes, categoriesRes, projectsRes, suppliersRes] =
    await Promise.all([
      supabase
        .from("invoices")
        .select(
          "*, supplier:suppliers(*), category:categories(*), project:projects(*)"
        )
        .eq("id", Number(id))
        .maybeSingle(),
      supabase.from("categories").select("*").order("name"),
      supabase.from("projects").select("*").order("name"),
      supabase.from("suppliers").select("*").order("name"),
    ]);

  if (!invoiceRes.data) {
    notFound();
  }

  // Vygeneruj signed URL pro stažení PDF (60 minut)
  let pdfUrl: string | null = null;
  if (invoiceRes.data.file_path) {
    const { data: signed } = await supabase.storage
      .from("invoices")
      .createSignedUrl(invoiceRes.data.file_path, 3600);
    pdfUrl = signed?.signedUrl ?? null;
  }

  return (
    <>
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-1">Detail faktury #{id}</h1>
        <p className="text-sm text-slate-500 mb-6">
          {invoiceRes.data.supplier?.name ?? "—"}
          {pdfUrl && (
            <>
              {" · "}
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Otevřít PDF
              </a>
            </>
          )}
        </p>
        <EditInvoiceForm
          invoice={invoiceRes.data as InvoiceWithRelations}
          categories={categoriesRes.data ?? []}
          projects={projectsRes.data ?? []}
          suppliers={suppliersRes.data ?? []}
        />
      </main>
    </>
  );
}
