import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const maxDuration = 60;

const EXTRACTION_PROMPT = `Jsi asistent pro extrakci dat z českých faktur v PDF.
Vrať POUZE JSON ve formátu níže (žádný markdown, žádný komentář, žádné code fence).
Pokud některý údaj v faktuře není, dej jeho hodnotu null.

Formát:
{
  "supplier_name": "název dodavatele (vystavovatel faktury)",
  "supplier_ico": "IČO dodavatele jen číslice",
  "invoice_number": "číslo faktury",
  "variable_symbol": "variabilní symbol",
  "issue_date": "datum vystavení ve formátu YYYY-MM-DD",
  "due_date": "datum splatnosti ve formátu YYYY-MM-DD",
  "amount_without_vat": 12345.67,
  "amount_with_vat": 14938.26,
  "currency": "CZK / EUR / USD",
  "description": "stručný popis předmětu fakturace (1 věta)"
}`;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY není nastavený" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Soubor 'file' chybí v requestu" },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Soubor musí být PDF" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: base64,
              },
            },
            { text: EXTRACTION_PROMPT },
          ],
        },
      ],
    });

    const text = response.text ?? "";

    // Gemini občas obalí JSON do ```json ... ``` — odstraň
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "AI nevrátila validní JSON", raw: text },
        { status: 502 }
      );
    }

    return NextResponse.json({ data: parsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neznámá chyba";
    return NextResponse.json(
      { error: "Extrakce selhala: " + message },
      { status: 500 }
    );
  }
}
