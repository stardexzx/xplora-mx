export async function getExchangeRate(base = "MXN", target = "USD"): Promise<number | null> {
  try {
    const url = `https://api.exchangerate.host/latest?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(target)}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn("Currency API error:", res.status);
      return null;
    }
    const data = await res.json();
    return data?.rates?.[target] ?? null;
  } catch (error) {
    console.error("Error fetching exchange rate:", error);
    return null;
  }
}
