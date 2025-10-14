"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchJSON } from "@/lib/api";

// Currency formatters
const AUD0 = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0,
});
const INT0 = new Intl.NumberFormat("en-AU", { maximumFractionDigits: 0 });

// stable helpers
function amountOf(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

export default function useRepTop3() {
  const [state, setState] = useState({
    loading: true,
    error: "",
    rows: [],
    asOf: "",
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await fetchJSON("rep-table"); // via /api/rep-table proxy
        if (!alive) return;
        const rows = Array.isArray(data?.rows) ? data.rows : Array.isArray(data) ? data : [];
        setState({ loading: false, error: "", rows, asOf: data?.as_of || "" });
      } catch (e) {
        setState({ loading: false, error: e?.message || String(e), rows: [], asOf: "" });
      }
    })();
    return () => { alive = false; };
  }, []);

  const teamTotal = useMemo(
    () => state.rows.reduce((s, r) => s + amountOf(r.sales), 0),
    [state.rows]
  );

  const top3 = useMemo(() => {
    const sorted = [...state.rows].sort((a, b) => amountOf(b.sales) - amountOf(a.sales));
    return sorted.slice(0, 3);
  }, [state.rows]);

  return {
    ...state,
    top3,
    teamTotal,
    // niceties
    fmtAUD: (n) => AUD0.format(amountOf(n)),
    fmtInt: (n) => INT0.format(amountOf(n)),
    shareOf: (row) => {
      const t = teamTotal || 1;
      return Math.max(0, Math.min(1, amountOf(row?.sales) / t));
    },
  };
}
