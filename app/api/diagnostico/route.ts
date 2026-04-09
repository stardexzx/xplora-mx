import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Intenta extraer y parsear JSON de texto que puede tener basura alrededor
function extractJSON(text: string): any {
  // 1. Limpiar bloques de código markdown
  let clean = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  // 2. Intentar parse directo
  try {
    return JSON.parse(clean);
  } catch {}

  // 3. Extraer el primer objeto JSON completo con balance de llaves
  const start = clean.indexOf("{");
  if (start === -1) throw new Error("No JSON object found");

  let depth = 0;
  let end = -1;
  for (let i = start; i < clean.length; i++) {
    if (clean[i] === "{") depth++;
    else if (clean[i] === "}") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }

  if (end === -1) throw new Error("Unclosed JSON object");

  const candidate = clean.slice(start, end + 1);

  // 4. Intentar parse del candidato
  try {
    return JSON.parse(candidate);
  } catch {}

  // 5. Reparación básica: eliminar comas finales antes de } o ]
  const repaired = candidate
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');

  return JSON.parse(repaired);
}

export async function POST(req: NextRequest) {
  const { negocioId, prompt } = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const MODELS = [
      "openrouter/free",
      "google/gemma-3-27b-it:free",
      "meta-llama/llama-4-scout:free",
      "mistralai/mistral-small-3.1-24b-instruct:free",
    ];

    let aiData: any = null;

    for (const model of MODELS) {
      const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://mexigo.com",
          "X-Title": "MexiGo",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 800,
        }),
      });

      aiData = await aiRes.json();
      console.log(`[${model}]:`, aiData.error?.message ?? "OK");
      if (!aiData.error) break;
    }

    if (!aiData || aiData.error) {
      return NextResponse.json({ error: "Todos los modelos fallaron" }, { status: 500 });
    }

    const raw = aiData.choices[0].message.content;
    console.log("[diagnostico] raw response:", raw.slice(0, 300));

    let diagnostico: any;
    try {
      diagnostico = extractJSON(raw);
    } catch (parseErr) {
      console.error("[diagnostico] JSON parse failed:", parseErr, "\nRaw:", raw);
      return NextResponse.json({ error: "La IA devolvió un formato inválido" }, { status: 500 });
    }

    // Normalizar campos array por si el modelo los devuelve como string
    diagnostico.gaps = Array.isArray(diagnostico.gaps)
      ? diagnostico.gaps : diagnostico.gaps ? [diagnostico.gaps] : [];
    diagnostico.modulos_recomendados = Array.isArray(diagnostico.modulos_recomendados)
      ? diagnostico.modulos_recomendados : [];
    diagnostico.turistas_objetivo = Array.isArray(diagnostico.turistas_objetivo)
      ? diagnostico.turistas_objetivo : diagnostico.turistas_objetivo ? [diagnostico.turistas_objetivo] : [];

    await supabase.from("diagnosticos").insert({
      negocio_id: negocioId,
      ...diagnostico,
      generado_en: new Date().toISOString(),
    });

    return NextResponse.json({ diagnostico });

  } catch (e) {
    console.error("OpenRouter error:", e);
    return NextResponse.json({ error: "Error generando diagnóstico" }, { status: 500 });
  }
}