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

/* -------- helpers -------- */
const TZ = "Australia/Perth";
const AUD0 = new Intl.NumberFormat("en-AU", {
	style: "currency",
	currency: "AUD",
	maximumFractionDigits: 0,
});

function perthYMD(d) {
	return new Date(d).toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD
}
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

export default function ChartAreaRolling7d() {
	const [state, setState] = React.useState({
		loading: true,
		error: "",
		data: [], // [{ day: "Mon 07", last7: number, prev7: number }]
		totals: { last7: 0, prev7: 0 },
		animKey: 0,
	});

	React.useEffect(() => {
		let alive = true;
		(async () => {
			try {
				const raw = await fetchJSON("sales-log"); // /api/sales-log proxy
				if (!alive) return;
				const rows = Array.isArray(raw) ? raw : Array.isArray(raw?.rows) ? raw.rows : [];

				// Build Perth-local map amount per day for the last 14 calendar days
				const now = new Date();
				const days = [];
				for (let i = 13; i >= 0; i--) {
					const d = new Date(now);
					d.setDate(d.getDate() - i);
					const ymd = perthYMD(d);
					days.push({
						ymd,
						display: d.toLocaleDateString("en-AU", { weekday: "short", day: "2-digit" }),
						sum: 0,
					});
				}
				const indexByYMD = new Map(days.map((d, i) => [d.ymd, i]));

				for (const r of rows) {
					const iso = dateField(r);
					if (!iso) continue;
					const ymd = /^\d{4}-\d{2}-\d{2}$/.test(String(iso)) ? String(iso) : perthYMD(iso);
					const idx = indexByYMD.get(ymd);
					if (idx == null) continue; // outside last 14 days
					const amt = amountOf(r);
					if (!Number.isFinite(amt) || amt <= 0) continue;
					days[idx].sum += amt;
				}

				// Split into prev7 (first 7) and last7 (last 7), then make cumulative
				const prev7 = days.slice(0, 7).map((d) => d.sum);
				const last7 = days.slice(7).map((d) => d.sum);

				const cum = (arr) => {
					const out = [];
					let run = 0;
					for (const v of arr) {
						run += v || 0;
						out.push(run);
					}
					return out;
				};
				const cumPrev7 = cum(prev7);
				const cumLast7 = cum(last7);

				// Build chart rows using labels from the last7 half
				const labelDays = days.slice(7);
				const data = labelDays.map((d, i) => ({
					date: d.ymd,
					label: d.display, // e.g., "Mon 07"
					last7: cumLast7[i],
					prev7: cumPrev7[i],
				}));

				setState({
					loading: false,
					error: "",
					data,
					totals: {
						last7: cumLast7[cumLast7.length - 1] || 0,
						prev7: cumPrev7[cumPrev7.length - 1] || 0,
						animKey: Date.now(),
					},
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
					<CardTitle>Last 7 Days Sales vs Prior 7</CardTitle>
				</div>
				<div className='flex justify-between gap-6'>
					<div>
						<div className='text-xs text-muted-foreground'>Current Period</div>
						<div className='tabular-nums font-semibold'>{AUD0.format(state.totals.last7)}</div>
					</div>
					<div>
						<div className='text-xs text-muted-foreground'>Previous Period</div>
						<div className='tabular-nums'>{AUD0.format(state.totals.prev7)}</div>
					</div>
				</div>
			</CardHeader>

			<CardContent className='px-2 pt-4 sm:px-6 sm:pt-6'>
				<ChartContainer
					config={{
						last7: { label: "Last 7 days", color: "var(--chart-1)" },
						prev7: { label: "Previous 7 days", color: "var(--chart-2)" },
					}}
					className='aspect-auto h-[200px] w-full'
				>
					<AreaChart key={state.animKey} data={state.data}>
						<defs>
							<linearGradient id='fillLast7' x1='0' y1='0' x2='0' y2='1'>
								<stop offset='5%' stopColor='var(--color-last7)' stopOpacity={0.8} />
								<stop offset='95%' stopColor='var(--color-last7)' stopOpacity={0.1} />
							</linearGradient>
							<linearGradient id='fillPrev7' x1='0' y1='0' x2='0' y2='1'>
								<stop offset='5%' stopColor='var(--color-prev7)' stopOpacity={0.8} />
								<stop offset='95%' stopColor='var(--color-prev7)' stopOpacity={0.1} />
							</linearGradient>
						</defs>

						<CartesianGrid vertical={false} />
						<XAxis
							dataKey='date'
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							minTickGap={18}
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
							dataKey='prev7'
							type='monotone'
							fill='url(#fillPrev7)'
							stroke='var(--color-prev7)'
							strokeWidth={2}
							dot={false}
							isAnimationActive
							animationBegin={200}
							animationDuration={900}
						/>
						<Area
							dataKey='last7'
							type='monotone'
							fill='url(#fillLast7)'
							stroke='var(--color-last7)'
							strokeWidth={2}
							dot={false}
							isAnimationActive
							animationBegin={200}
							animationDuration={900}
							animationEasing='ease-out'
						/>

						<ChartLegend content={<ChartLegendContent />} />
					</AreaChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
