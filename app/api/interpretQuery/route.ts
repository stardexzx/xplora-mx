import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

//fallback separado (más limpio)
function fallback(text: string) {
  const t = text.toLowerCase();

  let filters: any = {};
  let tags: string[] = [];

  // categorías
  if (t.includes("taco") || t.includes("comida")) filters.category = "comida";
  if (t.includes("bar") || t.includes("discoteca")) filters.category = "bar";
  if (t.includes("cafe")) filters.category = "cafe";

  // rating
  if (t.includes("bien valorado") || t.includes("bueno")) filters.rating = 4;

  // tags inteligentes
  if (t.includes("barato")) tags.push("barato");
  if (t.includes("lujo")) tags.push("lujo");
  if (t.includes("seguro")) tags.push("seguro");
  if (t.includes("extranjeros")) tags.push("turistico");
  if (t.includes("romantico")) tags.push("romantico");
  if (t.includes("familia")) tags.push("familiar");

  if (tags.length) filters.tags = tags;

  return filters;
}

export async function POST(req: NextRequest) {
  const { text } = await req.json();

  try {
    const prompt = `
Convierte esta frase de búsqueda en filtros JSON para una app de negocios locales en México.

Frase: "${text}"

Devuelve SOLO un objeto JSON con esta estructura exacta:
{
  "category": null,
  "rating": null,
  "tags": []
}

Reglas:
- "category": si menciona tipo de negocio, elige UNO de: "comida", "tours", "hospedaje", "artesanias", "entretenimiento". Si no aplica, pon null.
- "rating": número mínimo de estrellas (1-5) si el usuario pide calidad. Si no aplica, pon null.
- "tags": array de palabras clave del negocio (ej: ["barato", "romantico"]). Si no hay, pon [].

Solo JSON puro, sin markdown ni explicación.
`;

    //timeout de 3 segundos
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await anthropic.messages.create(
      {
        model: "claude-3-haiku-20240307",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      },
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    const raw = response.content[0].text;
    const clean = raw.replace(/```json|```/g, "").trim();

    try {
      const parsed = JSON.parse(clean);
      return NextResponse.json({ filters: parsed });

    } catch {
      console.warn("⚠️ JSON inválido → fallback");
      return NextResponse.json({ filters: fallback(text) });
    }

  } catch (e) {
    console.warn("⚠️ Claude falló → fallback inmediato");
    return NextResponse.json({ filters: fallback(text) });
  }
}