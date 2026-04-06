import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Declarado fuera del try para que el catch pueda acceder al fallback
  let text = "";

  try {
    const body = await req.json();
    text = body.text ?? "";

    if (!text) {
      return NextResponse.json({ translated: "" });
    }

    const res = await fetch("https://api-free.deepl.com/v2/translate", {
      method: "POST",
      headers: {
        "Authorization": `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        text,
        target_lang: "ES",
      }),
    });

    if (!res.ok) {
      console.warn("⚠️ DeepL respondió con error:", res.status);
      return NextResponse.json({ translated: text });
    }

    const data = await res.json();

    //Validar que la respuesta tenga la estructura esperada
    const translated = data?.translations?.[0]?.text;
    if (!translated) {
      console.warn("⚠️ Respuesta de DeepL inesperada:", data);
      return NextResponse.json({ translated: text });
    }

    return NextResponse.json({ translated });

  } catch (error) {
    console.error("Error DeepL:", error);

    //Ahora `text` siempre está en scope (aunque sea string vacío)
    return NextResponse.json({ translated: text });
  }
}