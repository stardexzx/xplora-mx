export async function translateText(text: string) {
  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      body: JSON.stringify({ text }),
      headers: { "Content-Type": "application/json" },
    });

    // VALIDACIÓN CLAVE
    if (!res.ok) {
      console.warn("⚠️ Error en API translate:", res.status);
      return text; // fallback → usa original
    }

    const data = await res.json();

    // VALIDACIÓN EXTRA
    if (!data || !data.translated) {
      console.warn("⚠️ Respuesta inválida translate");
      return text;
    }

    return data.translated;

  } catch (e) {
    console.error("Error translate:", e);

    // fallback total
    return text;
  }
}