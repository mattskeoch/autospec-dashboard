"use client";

import { useEffect, useMemo, useState } from "react";
import RepTable from "./rep-table";
import { fetchJSON } from "@/lib/api";

/**
 * sales-log row shape (already sanitized elsewhere in your app):
 * {
 *   date, customer, salesperson, source, orderNumber,
 *   orderTotal, outstanding, amountPaid, shop, orderId, tags
 * }
 */

function aggregateByRep(rows = []) {
	const byRep = new Map();

	for (const r of rows) {
		const repName = r.salesperson && r.salesperson !== "—" ? r.salesperson : "Unassigned";
		const cur = byRep.get(repName) || {
			rep: repName,
			sales: 0,
			deposits: 0,
			salesCount: 0,
			// Targets unknown here; 0 shows “—” in the table (same as v1 behavior).
			salesProgress: 0,
			depositProgress: 0,
		};

		cur.sales += Number(r.orderTotal || 0);
		cur.deposits += Number(r.amountPaid || 0);
		cur.salesCount += 1;

		byRep.set(repName, cur);
	}

	return Array.from(byRep.values());
}

export default function RepTableContainer() {
	const [state, setState] = useState({ rows: [], loading: true, error: "" });

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const res = await fetchJSON("sales-log");
				const rows = Array.isArray(res?.rows) ? res.rows : [];
				if (!cancelled) setState({ rows, loading: false, error: "" });
			} catch (e) {
				if (!cancelled) setState({ rows: [], loading: false, error: String(e) });
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const repRows = useMemo(() => aggregateByRep(state.rows), [state.rows]);

	if (state.error) {
		return <div className='px-4 text-sm text-red-400'>Error loading rep table: {state.error}</div>;
	}
	if (state.loading) {
		return <div className='px-4 text-sm text-neutral-400'>Loading reps…</div>;
	}

	return <RepTable rows={repRows} />;
}
