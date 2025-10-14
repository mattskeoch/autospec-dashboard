"use client";

import * as React from "react";
import { fetchJSON } from "@/lib/api";
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
	CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	IconCurrencyDollar,
	IconBuildingBank,
	IconFlame,
	IconChartLine,
} from "@tabler/icons-react";

/* ---------- formatters ---------- */
const AUD0 = new Intl.NumberFormat("en-AU", {
	style: "currency",
	currency: "AUD",
	maximumFractionDigits: 0,
});

/* ---------- v1-compatible sanitizers ---------- */
function sanitizeRow(r = {}) {
	const s = (v) => {
		if (v == null) return "";
		if (typeof v === "object") {
			if ("value" in v && v.value != null) return String(v.value);
			if (typeof v.toISOString === "function") return v.toISOString().slice(0, 10);
			if (v && typeof v.name === "string") return v.name;
			return String(v);
		}
		return String(v);
	};
	const n = (v) => {
		const x = Number(v);
		return Number.isFinite(x) ? x : 0;
	};

	return {
		date: s(r.date),
		customer: s(r.customer),
		salesperson: s(r.salesperson || r.salesPerson || r.sales_person || r.rep || ""),
		source: s(r.source),
		orderNumber: s(r.orderNumber || r.invoice || r.quoteNumber || ""),
		orderTotal: n(r.orderTotal ?? r.total ?? r.amount ?? 0),
		outstanding: n(r.outstanding ?? 0),
		amountPaid: n(r.amountPaid ?? r.deposit ?? 0),
		shop: s(r.shop),
		orderId: s(r.orderId ?? r.order_id ?? r.id ?? ""),
		tags: s(r.tags),
		processed_by: s(r.processed_by),
		cashier: s(r.cashier),
		owner: s(r.owner),
		created_by_name: s(r.created_by_name),
		created_by: s(r.created_by?.name),
		staff_name: s(r.staff_name ?? r.staff?.name),
		user_name: s(r.user?.name),
	};
}

/* ---------- rep name resolver with fallbacks ---------- */
function resolveRepName(row) {
	const candidates = [
		row.salesperson,
		row.rep,
		row.salesPerson,
		row.sales_person,
		row.owner,
		row.created_by_name,
		row.created_by,
		row.processed_by,
		row.cashier,
		row.staff_name,
		row.user_name,
	];
	const name = candidates.find((x) => typeof x === "string" && x.trim().length > 0);
	return (name || "Unassigned").trim();
}

const TZ = "Australia/Perth";
function perthYMD(d) {
	return new Date(d).toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD
}
function monthPrefixPerth(date) {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: TZ,
		year: "numeric",
		month: "2-digit",
	}).formatToParts(date);
	const y = parts.find((p) => p.type === "year")?.value;
	const m = parts.find((p) => p.type === "month")?.value;
	return `${y}-${m}-`;
}

/* ---------- small icon badge ---------- */
function IconBadge({ Icon }) {
	return (
		<div className='grid h-8 w-8 place-items-center rounded-full bg-muted ring-1 ring-border'>
			<Icon className='h-4 w-4 text-muted-foreground' />
		</div>
	);
}

/* ---------- single highlight card using your structure ---------- */
function HighlightCard({ label, primary, secondary, Icon }) {
	return (
		<Card className='@container/card' data-slot='card'>
			{/* Header with separator to match your metric cards */}
			<CardHeader>
				{/* Icon above the title */}
				<div className='grid h-10 w-10 place-items-center rounded-full bg-muted ring-1 ring-border'>
					<Icon className='h-5 w-5 text-muted-foreground' />
				</div>

				<CardDescription>{label}</CardDescription>

				<CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
					{primary}
				</CardTitle>

				<CardAction>
					{secondary ? (
						<span className='inline-flex'>
							<Badge variant='outline'>{secondary}</Badge>
						</span>
					) : null}
				</CardAction>
			</CardHeader>
		</Card>
	);
}
/* ---------- main ---------- */
export default function HighlightsTiles() {
	const [mounted, setMounted] = React.useState(false);
	const [state, setState] = React.useState({ loading: true, error: "", data: [] });

	React.useEffect(() => {
		setMounted(true);
	}, []);

	React.useEffect(() => {
		let alive = true;
		(async () => {
			try {
				const raw = await fetchJSON("sales-log");
				if (!alive) return;
				const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.rows) ? raw.rows : [];
				const sanitized = arr.map(sanitizeRow);

				// Pre-index: orderId/orderNumber -> rep name (from any row that already has a name)
				const byOrder = new Map();
				for (const r of sanitized) {
					const rep = resolveRepName(r);
					const key = r.orderId || r.orderNumber;
					if (rep && key && rep !== "Unassigned") {
						if (!byOrder.has(key)) byOrder.set(key, rep);
					}
				}

				// Backfill: for rows with missing rep, borrow from same order if available
				for (const r of sanitized) {
					const current = resolveRepName(r);
					if (current === "Unassigned") {
						const key = r.orderId || r.orderNumber;
						const found = key ? byOrder.get(key) : null;
						if (found) r.salesperson = found;
					}
				}

				setState({ loading: false, error: "", data: sanitized });
			} catch (e) {
				setState({ loading: false, error: e?.message || String(e), data: [] });
			}
		})();
		return () => {
			alive = false;
		};
	}, []);

	const { ls, md, mc, avg } = React.useMemo(() => {
		const prefix = monthPrefixPerth(new Date());
		const perRep = new Map(); // rep -> { salesSum, salesCount, depositSum, largestSale }

		for (const r0 of state.data) {
			const ymd = /^\d{4}-\d{2}-\d{2}$/.test(String(r0.date)) ? String(r0.date) : perthYMD(r0.date);
			if (!ymd.startsWith(prefix)) continue;

			const rep = resolveRepName(r0) || "Unassigned";
			if (!perRep.has(rep)) {
				perRep.set(rep, { salesSum: 0, salesCount: 0, depositSum: 0, largestSale: 0 });
			}
			const acc = perRep.get(rep);

			if (Number.isFinite(r0.amountPaid) && r0.amountPaid > 0) {
				acc.depositSum += r0.amountPaid; // deposits
			}
			if (Number.isFinite(r0.orderTotal) && r0.orderTotal > 0) {
				acc.salesSum += r0.orderTotal;
				acc.salesCount += 1;
				acc.largestSale = Math.max(acc.largestSale, r0.orderTotal);
			}
		}

		let largestSale = { rep: "—", amount: 0 };
		let mostDeposits = { rep: "—", amount: 0 };
		let mostSalesCount = { rep: "—", count: 0 };
		let highestAvgDeal = { rep: "—", amount: 0 };

		for (const [rep, v] of perRep.entries()) {
			if (v.largestSale > largestSale.amount) largestSale = { rep, amount: v.largestSale };
			if (v.depositSum > mostDeposits.amount) mostDeposits = { rep, amount: v.depositSum };
			if (v.salesCount > mostSalesCount.count) mostSalesCount = { rep, count: v.salesCount };
			const avgDeal = v.salesCount > 0 ? v.salesSum / v.salesCount : 0;
			if (avgDeal > highestAvgDeal.amount) highestAvgDeal = { rep, amount: avgDeal };
		}

		return { ls: largestSale, md: mostDeposits, mc: mostSalesCount, avg: highestAvgDeal };
	}, [state.data]);

	if (!mounted) return null;

	return (
		<div className='mx-4 lg:mx-6'>
			{/* 2×2 layout matching your screenshot, using your card structure */}
			<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
				<HighlightCard
					label='Largest Sale'
					primary={ls.amount ? AUD0.format(ls.amount) : "—"}
					secondary={ls.rep || "—"}
					Icon={IconCurrencyDollar}
				/>
				<HighlightCard
					label='Most Deposits'
					primary={md.amount ? AUD0.format(md.amount) : "—"}
					secondary={md.rep || "—"}
					Icon={IconBuildingBank}
				/>
				<HighlightCard
					label='Most Sales'
					primary={mc.count ? String(mc.count) : "—"}
					secondary={mc.rep || "—"}
					Icon={IconFlame}
				/>
				<HighlightCard
					label='Highest Avg Deal'
					primary={avg.amount ? AUD0.format(avg.amount) : "—"}
					secondary={avg.rep || "—"}
					Icon={IconChartLine}
				/>
			</div>

			{state.error ? (
				<div className='mt-2 text-xs text-destructive'>Error: {state.error}</div>
			) : null}
		</div>
	);
}
