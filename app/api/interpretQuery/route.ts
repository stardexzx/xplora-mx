import { NextRequest, NextResponse } from "next/server";

// Lista de tags disponibles
const AVAILABLE_TAGS = [
  "barato",
  "lujo",
  "seguro",
  "familiar",
  "romantico",
  "turistico",
  "gastronomico",
  "cultural",
  "vida nocturna",
  "al aire libre",
  "con niños",
  "pet friendly",
  "sin gluten",
];

const AVAILABLE_CATEGORIES = ["comida", "tours", "hospedaje", "artesanias", "entretenimiento"];

// Agrega aliases en simpleSearch
const CATEGORY_ALIASES: Record<string, string> = {
  "restaurant": "comida",
  "comer": "comida",
  "hotel": "hospedaje",
  "dormir": "hospedaje",
  "tour": "tours",
  "visitar": "tours",
  "artesania": "artesanias",
  "recuerdo": "artesanias",
  "bar": "entretenimiento",
  "antro": "entretenimiento",
};


// Búsqueda simple en tags, categorías, name, description
function simpleSearch(text: string): { category: string | null; tags: string[] } {
  const t = text.toLowerCase();
  const matchedTags: string[] = [];
  let matchedCategory: string | null = null;

  // Buscar tags
  for (const tag of AVAILABLE_TAGS) {
    if (t.includes(tag)) {
      matchedTags.push(tag);
    }
  }

  // Buscar categoría
  for (const category of AVAILABLE_CATEGORIES) {
    if (t.includes(category)) {
      matchedCategory = category;
      break; // Solo una categoría
    }
  }

  
// En simpleSearch, después del loop de categorías:
for (const [alias, cat] of Object.entries(CATEGORY_ALIASES)) {
  if (t.includes(alias) && !matchedCategory) {
    matchedCategory = cat;
    break;
  }
}

  return {
    category: matchedCategory,
    tags: matchedTags,
  };
}

export async function POST(req: NextRequest) {
  const { text } = await req.json();

  try {
    console.log("🔍 Búsqueda simple para:", text);
    const result = simpleSearch(text);

    return NextResponse.json({ filters: result, source: "simple_search" });
  } catch (e) {
    console.error("⚠️ Error en búsqueda:", e);
    return NextResponse.json({ filters: { category: null, tags: [] }, source: "error" });
  }
}