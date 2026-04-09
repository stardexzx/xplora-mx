// services/ia.ts
export async function interpretQuery(text: string) {
  const res = await fetch("/api/interpretQuery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const data = await res.json();
  return data.filters; // { category, tags }
}