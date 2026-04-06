import { NextRequest, NextResponse } from "next/server";

// Idiomas soportados por DeepL con sus códigos
const DEEPL_SUPPORTED: Record<string, string> = {
  en: "EN", pt: "PT", fr: "FR", de: "DE", it: "IT",
  ja: "JA", ko: "KO", ar: "AR", nl: "NL", pl: "PL",
  ru: "RU", zh: "ZH", tr: "TR", sv: "SV", da: "DA",
  fi: "FI", nb: "NB", cs: "CS", ro: "RO", hu: "HU",
  sk: "SK", bg: "BG", el: "EL", uk: "UK", id: "ID",
};

export async function POST(req: NextRequest) {
  let texts: string[] = [];

  try {
    const body = await req.json();
    texts = body.texts ?? [];
    const browserLang = (body.lang ?? "en").slice(0, 2).toLowerCase();

    // Si el idioma es español, devolvemos los textos sin traducir
    if (browserLang === "es") {
      return NextResponse.json({ translations: texts });
    }

    const targetLang = DEEPL_SUPPORTED[browserLang] ?? "EN";

    // DeepL acepta múltiples textos en una sola llamada con múltiples params `text`
    const params = new URLSearchParams();
    texts.forEach((t) => params.append("text", t));
    params.append("target_lang", targetLang);

    const res = await fetch("https://api-free.deepl.com/v2/translate", {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      console.warn("⚠️ DeepL UI error:", res.status);
      return NextResponse.json({ translations: texts });
    }

    const data = await res.json();
    const translations = data.translations?.map((t: any) => t.text) ?? texts;

    return NextResponse.json({ translations });

  } catch (error) {
    console.error("Error translateUI:", error);
    return NextResponse.json({ translations: texts });
  }
}