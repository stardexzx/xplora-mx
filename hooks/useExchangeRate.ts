import { useState, useEffect } from "react";
import { getExchangeRate } from "../services/currency";

export function useExchangeRate(base = "MXN", target = "USD") {
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadRate = async () => {
      setLoading(true);
      const fetched = await getExchangeRate(base, target);
      if (!cancelled) {
        setRate(fetched);
        setLoading(false);
      }
    };

    loadRate();
    return () => {
      cancelled = true;
    };
  }, [base, target]);

  return { rate, loading };
}
