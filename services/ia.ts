export async function interpretQuery(text: string) {
  try {
    const res = await fetch("/api/interpretQuery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) throw new Error("Error en API");

    const data = await res.json();
    return data.filters;

  } catch (e) {
    console.error("Error interpretQuery cliente:", e);
    return {};
  }
}