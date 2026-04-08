import { NextRequest, NextResponse } from "next/server";

// ── Recursos de Coppel Emprende ──────────────────────────────────────────────
const VIDEO_COPPEL  = "https://www.fundacioncoppel.org/wp-content/uploads/2024/02/coppel-comofuncionaenko.mp4";
const REGISTRO_URL  = "https://www.coppelemprende.com/coppelemprende";
const ARTICULO_URL  = "https://www.fundacioncoppel.org/2024/04/15/coppel-emprende-herramienta-para-transformar-tu-emprendimiento/";

const CONOCIMIENTO_COPPEL = `
Coppel Emprende es un programa gratuito de Fundación Coppel para MiPyMEs mexicanas.
Registro: https://www.coppelemprende.com/coppelemprende (solo necesitas celular)

COMPONENTES:
1. Capacitación: +90 lecciones en video sobre administración, finanzas, ventas, marketing, servicio al cliente.
2. Fortalecimiento: Webinars, talleres y master class con expertos en tiempo real.
3. Seminarios: Sesiones grupales sobre temas de actualidad.
4. Recompensas: "Llaves" canjeables por lectores de tarjeta bancaria, boletos de cine, audiolibros.
5. Comunidad: Red de emprendedores para compartir experiencias y hacer negocios.

TEMAS CUBIERTOS: pagos digitales, formalización SAT, educación financiera, ventas, marketing digital, redes sociales, servicio al cliente, liderazgo, empresa familiar.

DATO CLAVE PAGOS: El sistema de recompensas incluye lectores de tarjeta bancaria gratis al completar lecciones.
`;

export interface AsesoriaMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AsesoriaResult {
  respuesta: string;
  problema: string;
  categoria: string;
  recomendacion: string;
  acciones: string[];
  aprendizaje: { tema: string; descripcion: string };
  mostrarVideo: boolean;
  temas: string[];
  accionPrincipal: string;
  registroUrl: string;
  videoUrl: string;
  articuloUrl: string;
}

// ── System prompt con el formato que pediste ─────────────────────────────────
function buildSystemPrompt(negocio: Record<string, unknown>) {
  return `Eres un asesor experto en negocios pequeños en México integrado en la app Xplora MX.
Tu tarea es analizar el problema de un emprendedor y devolver recomendaciones prácticas, claras y accionables.

Contexto del negocio actual:
- Nombre: ${negocio.name}
- Categoría: ${negocio.category}
- Descripción: ${negocio.description ?? "Sin descripción"}
- Tags: ${negocio.tags ?? "Sin tags"}
- Tiene teléfono: ${negocio.phone ? "Sí" : "No"}
- Tiene sitio web: ${negocio.website ? "Sí" : "No"}
- Calificación: ${negocio.rating ?? "Sin calificación"}

Información del programa Coppel Emprende (úsala en tus recomendaciones):
${CONOCIMIENTO_COPPEL}

Instrucciones:
1. Identifica el problema principal del negocio
2. Clasifica el problema en una de estas categorías: ventas, marketing, pagos, finanzas, operaciones
3. Da una recomendación concreta (qué debe hacer)
4. Da 2-3 acciones simples paso a paso
5. Sugiere aprender más con Coppel Emprende (menciona el módulo o tema específico relevante)

Reglas:
- Usa lenguaje simple (como si hablaras con alguien sin experiencia técnica)
- Sé directo, máximo 2-3 oraciones por campo
- No uses tecnicismos complicados
- Si el problema es pagos: menciona que Coppel Emprende regala lectores de tarjeta como recompensa
- Si no tiene web: recomienda el módulo de marketing digital y redes sociales
- Si el rating es bajo: recomienda el módulo de servicio al cliente

Formato de respuesta (JSON puro, sin markdown, sin explicación):
{
  "problema": "descripción breve del problema identificado",
  "categoria": "ventas|marketing|pagos|finanzas|operaciones",
  "recomendacion": "qué debe hacer concretamente",
  "acciones": ["acción 1", "acción 2", "acción 3"],
  "aprendizaje": {
    "tema": "nombre del módulo o tema de Coppel Emprende",
    "descripcion": "por qué este módulo le ayudaría"
  },
  "respuesta": "mensaje conversacional cálido resumiendo todo lo anterior en 2-3 oraciones",
  "mostrarVideo": true,
  "temas": ["categoria del problema"],
  "accionPrincipal": "la acción más urgente en 1 oración"
}`;
}

// ── OpenRouter fetch (compatible con OpenAI API) ──────────────────────────────
async function callOpenRouter(
  systemPrompt: string,
  messages: { role: string; content: string }[]
) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY no configurada");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://xploramx.com",
      "X-Title": "XploraMX Asesoria",
    },
    body: JSON.stringify({
      model: "anthropic/claude-haiku-4-5",   // puedes cambiar a openai/gpt-4o-mini, etc.
      max_tokens: 700,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function POST(req: NextRequest) {
  const { negocio, pregunta, historial = [] } = await req.json();

  // Construir historial de mensajes
  const messages: { role: string; content: string }[] = [];
  for (const msg of historial as AsesoriaMessage[]) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Mensaje actual — si no hay pregunta explícita, generamos el análisis inicial
  const mensajeUsuario = pregunta
    ? pregunta.replace("{{input}}", pregunta)   // compatibilidad con el template
    : `Analiza mi negocio "${negocio.name}" (${negocio.category}) y dame recomendaciones. ${negocio.description ? `Descripción: ${negocio.description}.` : ""} ${negocio.tags ? `Tags: ${negocio.tags}.` : ""} ${!negocio.website ? "No tenemos sitio web." : ""} ${!negocio.phone ? "No tenemos teléfono registrado." : ""} ${negocio.rating ? `Calificación actual: ${negocio.rating}/5.` : "Sin calificación aún."}`;

  messages.push({ role: "user", content: mensajeUsuario });

  const systemPrompt = buildSystemPrompt(negocio as Record<string, unknown>);

  try {
    const raw = await callOpenRouter(systemPrompt, messages);
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    const result: AsesoriaResult = {
      problema:       parsed.problema       ?? "Tu negocio tiene oportunidades de mejora.",
      categoria:      parsed.categoria      ?? "operaciones",
      recomendacion:  parsed.recomendacion  ?? "Regístrate en Coppel Emprende para recibir capacitación gratuita.",
      acciones:       parsed.acciones       ?? ["Regístrate en Coppel Emprende", "Completa las lecciones de tu área", "Aplica lo aprendido en tu negocio"],
      aprendizaje:    parsed.aprendizaje    ?? { tema: "Capacitación general", descripcion: "Coppel Emprende tiene +90 lecciones gratuitas para tu negocio." },
      respuesta:      parsed.respuesta      ?? "Coppel Emprende puede ayudarte con capacitación gratuita.",
      mostrarVideo:   parsed.mostrarVideo   ?? historial.length === 0,
      temas:          parsed.temas          ?? [parsed.categoria ?? "general"],
      accionPrincipal: parsed.accionPrincipal ?? "Regístrate gratis en Coppel Emprende con tu número de celular.",
      registroUrl:    REGISTRO_URL,
      videoUrl:       VIDEO_COPPEL,
      articuloUrl:    ARTICULO_URL,
    };

    return NextResponse.json(result);

  } catch (e) {
    console.error("Asesoria error:", e);
    // Fallback sin IA
    return NextResponse.json({
      problema: "No se pudo analizar el negocio automáticamente.",
      categoria: "operaciones",
      recomendacion: "Regístrate en Coppel Emprende para acceder a +90 lecciones gratuitas.",
      acciones: [
        "Entra a coppelemprende.com con tu celular",
        "Completa las lecciones de ventas y marketing",
        "Aplica los consejos en tu negocio esta semana",
      ],
      aprendizaje: { tema: "Capacitación general", descripcion: "Coppel Emprende cubre ventas, finanzas, pagos digitales y más." },
      respuesta: "Coppel Emprende ofrece más de 90 lecciones gratuitas. Solo necesitas tu celular para registrarte.",
      mostrarVideo: true,
      temas: ["general"],
      accionPrincipal: "Regístrate gratis en Coppel Emprende.",
      registroUrl: REGISTRO_URL,
      videoUrl: VIDEO_COPPEL,
      articuloUrl: ARTICULO_URL,
    } as AsesoriaResult);
  }
}