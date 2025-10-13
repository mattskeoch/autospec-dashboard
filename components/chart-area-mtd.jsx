"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { fetchJSON } from "@/lib/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";

/* ---------- helpers ---------- */
const TZ = "Australia/Perth";
const AUD0 = new Intl.NumberFormat("en-AU", {
	style: "currency",
	currency: "AUD",
	maximumFractionDigits: 0,
});

function perthYMD(d) {
	return new Date(d).toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD
}

// amounts: be tolerant to shapes you’ve used elsewhere
function amountOf(r) {
	return Number(
		r?.adjusted_order_total ??
			r?.order_total_after_labour ??
			r?.order_total_net ??
			r?.order_total ??
			r?.orderTotal ??
			r?.amountPaid ??
			0
	);
}

function dateField(r) {
	return (
		r?.date_utc ??
		r?.created_at ??
		r?.created_at_utc ??
		r?.last_updated_at ??
		r?.fulfillment_date_utc ??
		r?.date ??
		null
	);
}

/* ---------- component ---------- */
export default function ChartAreaMTD() {
	const [state, setState] = React.useState({
		loading: true,
		error: "",
		data: [],
		thisMonthTotal: 0,
		lastMonthTotalThruToday: 0,
	});

	React.useEffect(() => {
		let alive = true;
		(async () => {
			try {
				const raw = await fetchJSON("sales-log"); // proxy: /api/sales-log
				if (!alive) return;
				const rows = Array.isArray(raw) ? raw : Array.isArray(raw?.rows) ? raw.rows : [];

				// Determine current (Perth) Y/M/D and previous month
				const now = new Date();
				const parts = new Intl.DateTimeFormat("en-CA", {
					timeZone: TZ,
					year: "numeric",
					month: "2-digit",
					day: "2-digit",
				}).formatToParts(now);
				const y = Number(parts.find((p) => p.type === "year").value);
				const m = Number(parts.find((p) => p.type === "month").value);
				const dToday = Number(parts.find((p) => p.type === "day").value);

				const thisMonthPrefix = `${String(y)}-${String(m).padStart(2, "0")}-`;

				// prev month (handle Jan -> Dec of prev year)
				const prevDate = new Date(Date.UTC(y, m - 1, 1)); // first of this month UTC baseline
				prevDate.setUTCMonth(prevDate.getUTCMonth() - 1); // go to previous month
				const py = prevDate.getUTCFullYear();
				const pm = prevDate.getUTCMonth() + 1;
				const prevMonthPrefix = `${String(py)}-${String(pm).padStart(2, "0")}-`;
				// days in prev month
				const daysInPrevMonth = new Date(py, pm, 0).getDate();

				// buckets by day-of-month
				const thisBuckets = new Array(dToday).fill(0);
				const prevBuckets = new Array(Math.min(dToday, daysInPrevMonth)).fill(0);

				// bucket sales
				for (const r of rows) {
					const rawDt = dateField(r);
					if (!rawDt) continue;
					const ymd = /^\d{4}-\d{2}-\d{2}$/.test(String(rawDt)) ? String(rawDt) : perthYMD(rawDt);
					const amt = amountOf(r);
					if (!Number.isFinite(amt) || amt <= 0) continue;

					if (ymd.startsWith(thisMonthPrefix)) {
						const day = Number(ymd.slice(-2));
						if (day >= 1 && day <= dToday) thisBuckets[day - 1] += amt;
					} else if (ymd.startsWith(prevMonthPrefix)) {
						const day = Number(ymd.slice(-2));
						if (day >= 1 && day <= prevBuckets.length) prevBuckets[day - 1] += amt;
					}
				}

				// cumulative series
				const cumThis = [];
				const cumPrev = [];
				let runThis = 0,
					runPrev = 0;
				for (let i = 0; i < dToday; i++) {
					runThis += thisBuckets[i] || 0;
					cumThis.push(runThis);
					if (i < prevBuckets.length) {
						runPrev += prevBuckets[i] || 0;
						cumPrev.push(runPrev);
					} else {
						// keep prev flat beyond its month length
						cumPrev.push(runPrev);
					}
				}

				// build chart data with YYYY-MM-DD labels (this month’s dates)
				const data = [];
				for (let i = 0; i < dToday; i++) {
					const date = perthYMD(new Date(Date.UTC(y, m - 1, i + 1)));
					data.push({
						date,
						thisMonth: cumThis[i],
						lastMonth: cumPrev[i],
					});
				}

				setState({
					loading: false,
					error: "",
					data,
					thisMonthTotal: runThis,
					lastMonthTotalThruToday: cumPrev[dToday - 1] || 0,
				});
			} catch (e) {
				setState((s) => ({ ...s, loading: false, error: e?.message || String(e) }));
			}
		})();
		return () => {
			alive = false;
		};
	}, []);

	return (
		<Card className='pt-0'>
			<CardHeader className='flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row'>
				<div className='grid flex-1 gap-1'>
					<CardTitle>Accumulative Sales — MTD vs Last Month</CardTitle>
				</div>
				{/* Simple totals at the right */}
				<div className='text-right'>
					<div className='text-xs text-muted-foreground'>MTD</div>
					<div className='tabular-nums font-semibold'>{AUD0.format(state.thisMonthTotal || 0)}</div>
					<div className='text-xs text-muted-foreground mt-1'>Last month (thru today)</div>
					<div className='tabular-nums'>{AUD0.format(state.lastMonthTotalThruToday || 0)}</div>
				</div>
			</CardHeader>

			<CardContent className='px-2 pt-4 sm:px-6 sm:pt-6'>
				<ChartContainer
					config={{
						thisMonth: { label: "This Month", color: "var(--chart-1)" },
						lastMonth: { label: "Last Month", color: "var(--chart-2)" },
					}}
					className='aspect-auto h-[260px] w-full'
				>
					<AreaChart data={state.data}>
						<defs>
							<linearGradient id='fillThis' x1='0' y1='0' x2='0' y2='1'>
								<stop offset='5%' stopColor='var(--color-thisMonth)' stopOpacity={0.8} />
								<stop offset='95%' stopColor='var(--color-thisMonth)' stopOpacity={0.1} />
							</linearGradient>
							<linearGradient id='fillLast' x1='0' y1='0' x2='0' y2='1'>
								<stop offset='5%' stopColor='var(--color-lastMonth)' stopOpacity={0.8} />
								<stop offset='95%' stopColor='var(--color-lastMonth)' stopOpacity={0.1} />
							</linearGradient>
						</defs>

						<CartesianGrid vertical={false} />
						<XAxis
							dataKey='date'
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							minTickGap={28}
							tickFormatter={(value) => {
								const d = new Date(value);
								return d.toLocaleDateString("en-AU", { month: "short", day: "numeric" });
							}}
						/>

						<ChartTooltip
							cursor={false}
							content={
								<ChartTooltipContent
									labelFormatter={(value) =>
										new Date(value).toLocaleDateString("en-AU", { month: "short", day: "numeric" })
									}
									indicator='dot'
									valueFormatter={(v, name) => `${AUD0.format(Number(v || 0))} • ${name}`}
								/>
							}
						/>

						<Area
							dataKey='lastMonth'
							type='monotone'
							fill='url(#fillLast)'
							stroke='var(--color-lastMonth)'
							strokeWidth={2}
							dot={false}
							isAnimationActive
						/>
						<Area
							dataKey='thisMonth'
							type='monotone'
							fill='url(#fillThis)'
							stroke='var(--color-thisMonth)'
							strokeWidth={2}
							dot={false}
							isAnimationActive
						/>

						<ChartLegend content={<ChartLegendContent />} />
					</AreaChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
