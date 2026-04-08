import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { negocioId, prompt } = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const MODELS = [
  "openrouter/free",           // router automático — elige el disponible
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
      "HTTP-Referer": "https://xploramx.com",
      "X-Title": "XploraMX",
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

const raw = aiData.choices[0].message.content
  .replace(/```json|```/g, "")
  .trim();

    const diagnostico = JSON.parse(raw);

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