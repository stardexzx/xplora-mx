import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const { negocioId, prompt } = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307", // el más barato, ~$0.001 por diagnóstico
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].text.replace(/```json|```/g, "").trim();
    console.log("Claude raw:", raw);
    const diagnostico = JSON.parse(raw);

    await supabase.from("diagnosticos").insert({
      negocio_id: negocioId,
      ...diagnostico,
      generado_en: new Date().toISOString(),
    });

    return NextResponse.json({ diagnostico });

  } catch (e) {
    console.error("Error diagnóstico:", e);
    return NextResponse.json({ error: "No se pudo generar el diagnóstico" }, { status: 500 });
  }
}