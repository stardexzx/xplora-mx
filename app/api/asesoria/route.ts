import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// Video oficial de Coppel Emprende (MP4 público en el servidor de Fundación Coppel)
const VIDEO_COPPEL = "https://www.fundacioncoppel.org/wp-content/uploads/2024/02/coppel-comofuncionaenko.mp4";
const REGISTRO_URL = "https://www.coppelemprende.com/coppelemprende";
const FUNDACION_URL = "https://www.fundacioncoppel.org/coppel-emprende/";
const ARTICULO_URL = "https://www.fundacioncoppel.org/2024/04/15/coppel-emprende-herramienta-para-transformar-tu-emprendimiento/";

// Conocimiento real extraído de fundacioncoppel.org sobre los 5 componentes y temas
const CONOCIMIENTO_COPPEL = `
Coppel Emprende es un programa gratuito de Fundación Coppel para MiPyMEs mexicanas.
Solo necesitas un número de celular para registrarte en: https://www.coppelemprende.com/coppelemprende

COMPONENTES DEL PROGRAMA (extraído de fundacioncoppel.org/coppel-emprende):
1. Capacitación: Más de 90 lecciones en video On Demand sobre administración, finanzas, ventas, marketing, servicio al cliente y desarrollo personal.
2. Fortalecimiento: Sesiones grupales en línea (webinars, talleres, master class) con expertos en tiempo real.
3. Seminarios: Sesiones grupales sobre temas de actualidad aplicables a los negocios.
4. Recompensas: Sistema de "llaves" canjeables por lectores de tarjeta bancaria, boletos de cine, audiolibros y más.
5. Comunidad empresarial: Red de emprendedores para compartir experiencias y hacer negocios entre ellos.

TEMAS CUBIERTOS:
- Digitalización de negocios y pagos digitales
- Formalización ante el SAT y registro de empresa
- Educación financiera y manejo del dinero
- Estrategias de ventas y atracción de clientes
- Marketing digital y redes sociales
- Servicio al cliente y fidelización
- Liderazgo y empresa familiar
- Mercadotecnia y promociones

BENEFICIOS DOCUMENTADOS:
- 11,000+ personas registradas en la plataforma
- 96% de satisfacción de usuarios
- Gratuito, solo necesitas celular
- Cursos en Abarrotes, Restaurantes, Pastelerías, Boutiques, Ventas en general

SOBRE PAGOS DIGITALES ESPECÍFICAMENTE:
El programa de recompensas de Coppel Emprende incluye lectores de tarjeta bancaria como premio por completar lecciones. Además hay lecciones específicas sobre digitalización y cómo aceptar pagos electrónicos sin efectivo.
`;

export interface AsesoriaMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AsesoriaResult {
  respuesta: string;
  mostrarVideo: boolean;
  videoPoster?: string;
  temas: string[];
  accionPrincipal: string;
  registroUrl: string;
  videoUrl: string;
  articuloUrl: string;
}

export async function POST(req: NextRequest) {
  const { negocio, pregunta, historial = [] } = await req.json();

  // Construir el historial de mensajes para conversación multi-turno
  const messages: { role: "user" | "assistant"; content: string }[] = [];

  // Agregar historial previo
  for (const msg of historial) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Agregar el mensaje actual del usuario
  const mensajeUsuario = pregunta
    ? pregunta
    : `Analiza este negocio y dame consejos específicos de Coppel Emprende:\n- Nombre: ${negocio.name}\n- Categoría: ${negocio.category}\n- Descripción: ${negocio.description ?? "Sin descripción"}\n- Tags: ${negocio.tags ?? "Sin tags"}\n- Tiene teléfono: ${negocio.phone ? "Sí" : "No"}\n- Tiene sitio web: ${negocio.website ? "Sí" : "No"}\n- Calificación: ${negocio.rating ?? "Sin calificación"}`;

  messages.push({ role: "user", content: mensajeUsuario });

  const systemPrompt = `Eres el asistente de Coppel Emprende integrado en la app Xplora MX. Ayudas a dueños de negocios mexicanos con consejos prácticos basados en el programa de Fundación Coppel.

NEGOCIO ACTUAL:
- Nombre: ${negocio.name}
- Categoría: ${negocio.category}
- Descripción: ${negocio.description ?? "Sin descripción"}
- Tags: ${negocio.tags ?? "Sin tags"}
- Tiene teléfono: ${negocio.phone ? "Sí" : "No"}
- Tiene sitio web: ${negocio.website ? "Sí" : "No"}
- Calificación: ${negocio.rating ?? "Sin calificación"}

CONOCIMIENTO DE COPPEL EMPRENDE:
${CONOCIMIENTO_COPPEL}

INSTRUCCIONES:
- Responde siempre en español, de forma cálida y directa
- Máximo 3-4 párrafos o bullet points cortos
- Cita siempre recursos REALES de Coppel Emprende (lecciones, webinars, sistema de recompensas)
- Si mencionas pagos con tarjeta: explica que Coppel Emprende regala lectores de tarjeta como recompensa por completar lecciones
- Si el negocio no tiene web: menciona el módulo de redes sociales y digitalización
- Si el rating es bajo o sin calificación: recomienda el módulo de servicio al cliente
- Siempre termina con una acción concreta y el enlace de registro
- NO inventes cursos o recursos que no existen en el conocimiento dado

FORMATO DE RESPUESTA (JSON puro, sin markdown):
{
  "respuesta": "texto de respuesta para el dueño del negocio",
  "mostrarVideo": true/false (true si es la primera interacción o preguntan cómo funciona),
  "temas": ["tema1", "tema2"],
  "accionPrincipal": "acción específica y concreta en 1 oración"
}`;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      system: systemPrompt,
      messages,
    });

    const raw = (response.content[0] as { text: string }).text;
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    const result: AsesoriaResult = {
      respuesta: parsed.respuesta ?? "Coppel Emprende puede ayudarte a hacer crecer tu negocio con capacitación gratuita.",
      mostrarVideo: parsed.mostrarVideo ?? historial.length === 0,
      temas: parsed.temas ?? ["general"],
      accionPrincipal: parsed.accionPrincipal ?? "Regístrate gratis en Coppel Emprende con tu número de celular.",
      registroUrl: REGISTRO_URL,
      videoUrl: VIDEO_COPPEL,
      articuloUrl: ARTICULO_URL,
    };

    return NextResponse.json(result);
  } catch (e) {
    console.error("Asesoria error:", e);
    return NextResponse.json({
      respuesta: "Coppel Emprende ofrece más de 90 lecciones gratuitas sobre ventas, finanzas, marketing digital y formalización. Solo necesitas tu celular para registrarte.",
      mostrarVideo: true,
      temas: ["general"],
      accionPrincipal: "Regístrate gratis en coppelemprende.com con tu número de celular.",
      registroUrl: REGISTRO_URL,
      videoUrl: VIDEO_COPPEL,
      articuloUrl: ARTICULO_URL,
    } as AsesoriaResult);
  }
}