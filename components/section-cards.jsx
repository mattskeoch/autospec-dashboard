"use client";

import { useEffect, useState } from "react";
import { IconTrendingDown, IconTrendingUp, IconMinus } from "@tabler/icons-react";
import { fetchJSON, currentYearMonth } from "@/lib/api";

import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardAction,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

/* ========================= Helpers ========================= */

const AUD0 = new Intl.NumberFormat("en-AU", {
	style: "currency",
	currency: "AUD",
	maximumFractionDigits: 0,
});

const pctStr = (v) => {
	if (v == null || Number.isNaN(Number(v))) return null;
	const n = Number(v);
	const pct = Math.abs(n) <= 1 ? n * 100 : n; // accept 0.125 or 12.5
	const rounded = Math.round(pct);
	const sign = rounded > 0 ? "+" : ""; // minus comes from toString()
	return `${sign}${rounded}%`;
};

function toPercentNumber(v) {
	if (v == null || Number.isNaN(Number(v))) return null;
	const n = Number(v);
	return Math.abs(n) <= 1 ? n * 100 : n;
}

function getTrend(delta) {
	const pct = toPercentNumber(delta);
	if (pct == null) return null;
	if (pct > 0) return "up";
	if (pct < 0) return "down";
	return "flat";
}

function badgeClassesForDelta(delta) {
	if (delta == null || Number.isNaN(Number(delta))) return "";
	const n = Number(delta);
	const pct = Math.abs(n) <= 1 ? n * 100 : n;
	return pct >= 0
		? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10"
		: "border-rose-500/40 text-rose-700 dark:text-rose-300 bg-rose-500/10";
}

/** Org target: scope="org", metric="sales", key in {all, online, partner} */
function pickOrgTarget(rows, key = "all") {
	const k = String(key).toLowerCase();
	const row = (rows || []).find(
		(r) =>
			String(r?.scope || "").toLowerCase() === "org" &&
			String(r?.metric || "").toLowerCase() === "sales" &&
			String(r?.key || "").toLowerCase() === k
	);
	return Number(row?.target || 0);
}

/** Store/region target: scope="store", metric="sales", key="east"|"west" */
function pickStoreTarget(rows, region) {
	const r = String(region).toLowerCase();
	const row = (rows || []).find(
		(x) =>
			String(x?.scope || "").toLowerCase() === "store" &&
			String(x?.metric || "").toLowerCase() === "sales" &&
			String(x?.key || "").toLowerCase() === r
	);
	return Number(row?.target || 0);
}

/* ========================= Component ========================= */

export function SectionCards() {
	// Card 1: Total MTD (value, delta badge, % of target + progress bar)
	const [mtd, setMtd] = useState({
		loading: true,
		value: null,
		delta: null,
		target: null,
		percent: 0,
		error: null,
	});

	// Card 2: East MTD (value, delta badge, % of target + bar)
	const [east, setEast] = useState({
		loading: true,
		value: null,
		delta: null,
		target: null,
		percent: 0,
		error: null,
	});

	// Card 3: West MTD (value, delta badge, % of target + bar)
	const [west, setWest] = useState({
		loading: true,
		value: null,
		delta: null,
		target: null,
		percent: 0,
		error: null,
	});

	// Card 4: Online Sales (value, % of target + progress bar)
	const [online, setOnline] = useState({
		loading: true,
		value: null,
		target: null,
		percent: 0,
		error: null,
	});

	useEffect(() => {
		let alive = true;
		(async () => {
			try {
				const ym = currentYearMonth();
				const [kpis, targets, highlights] = await Promise.all([
					fetchJSON("kpis/mtd"), // totals + deltas for all/east/west
					fetchJSON(`targets?month=${ym}`), // targets rows
					fetchJSON("kpis/highlights"), // totals.online_sales_mtd etc
				]);
				if (!alive) return;

				// KPI values
				const totalValue = Number(kpis?.total_mtd ?? 0);
				const totalDelta = Number(kpis?.delta_all_vs_last_month ?? NaN);

				const eastValue = Number(kpis?.east_mtd ?? 0);
				const eastDelta = Number(kpis?.delta_east_vs_last_month ?? NaN);

				const westValue = Number(kpis?.west_mtd ?? 0);
				const westDelta = Number(kpis?.delta_west_vs_last_month ?? NaN);

				// Online value from highlights
				const onlineValue = Number(highlights?.totals?.online_sales_mtd ?? 0);

				// Targets (per your schema)
				const orgTargetAll = pickOrgTarget(targets?.rows, "all"); // Total
				const eastTarget = pickStoreTarget(targets?.rows, "east"); // Store East
				const westTarget = pickStoreTarget(targets?.rows, "west"); // Store West
				const onlineTarget = pickOrgTarget(targets?.rows, "online"); // Org Online

				// Percents
				const totalPercent =
					orgTargetAll > 0 ? Math.max(0, Math.min(1, totalValue / orgTargetAll)) : 0;
				const eastPercent = eastTarget > 0 ? Math.max(0, Math.min(1, eastValue / eastTarget)) : 0;
				const westPercent = westTarget > 0 ? Math.max(0, Math.min(1, westValue / westTarget)) : 0;
				const onlinePercent =
					onlineTarget > 0 ? Math.max(0, Math.min(1, onlineValue / onlineTarget)) : 0;

				// Set state
				setMtd({
					loading: false,
					value: totalValue,
					delta: Number.isFinite(totalDelta) ? totalDelta : null,
					target: Number.isFinite(orgTargetAll) ? orgTargetAll : 0,
					percent: totalPercent,
					error: null,
				});

				setEast({
					loading: false,
					value: eastValue,
					delta: Number.isFinite(eastDelta) ? eastDelta : null,
					target: Number.isFinite(eastTarget) ? eastTarget : 0,
					percent: eastPercent,
					error: null,
				});

				setWest({
					loading: false,
					value: westValue,
					delta: Number.isFinite(westDelta) ? westDelta : null,
					target: Number.isFinite(westTarget) ? westTarget : 0,
					percent: westPercent,
					error: null,
				});

				setOnline({
					loading: false,
					value: onlineValue,
					target: Number.isFinite(onlineTarget) ? onlineTarget : 0,
					percent: onlinePercent,
					error: null,
				});
			} catch (e) {
				const msg = e?.message || String(e);
				setMtd({ loading: false, value: null, delta: null, target: null, percent: 0, error: msg });
				setEast({ loading: false, value: null, delta: null, target: null, percent: 0, error: msg });
				setWest({ loading: false, value: null, delta: null, target: null, percent: 0, error: msg });
				setOnline({ loading: false, value: null, target: null, percent: 0, error: msg });
			}
		})();
		return () => {
			alive = false;
		};
	}, []);

	// simple badge style for percent-of-target (online)
	const badgeForPercent = (p, hasTarget) =>
		hasTarget
			? p >= 1
				? "bg-emerald-500/15 text-emerald-300"
				: "bg-neutral-700 text-neutral-300"
			: "bg-neutral-800 text-neutral-500";

	return (
		<div className='*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4'>
			{/* ---------------- Card 1: Total Sales ---------------- */}
			<Card className='@container/card' data-slot='card'>
				<CardHeader>
					<CardDescription>Total Sales</CardDescription>
					<CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-4xl'>
						{mtd.loading ? "…" : AUD0.format(mtd.value || 0)}
					</CardTitle>
					<CardAction>
						{mtd.error ? (
							<Badge variant='outline'>Error</Badge>
						) : mtd.delta != null ? (
							<Badge variant='outline' className={badgeClassesForDelta(mtd.delta)}>
								{getTrend(mtd.delta) === "up" ? (
									<IconTrendingUp />
								) : getTrend(mtd.delta) === "down" ? (
									<IconTrendingDown />
								) : (
									<IconMinus />
								)}
								{pctStr(mtd.delta)}
							</Badge>
						) : null}
					</CardAction>
				</CardHeader>
				<CardFooter className='flex-col items-start gap-1.5 text-sm'>
					{mtd.error ? (
						<>
							<div className='font-medium'>Couldn’t load MTD.</div>
							<div className='text-muted-foreground'>{mtd.error}</div>
						</>
					) : (
						<>
							{/* % of target */}
							<div className='mb-1 text-xs text-muted-foreground tabular-nums'>
								{Number(mtd.target) > 0 ? `${Math.round(mtd.percent * 100)}%` : "—"}{" "}
								<span className='text-muted-foreground'>
									of {Number(mtd.target) > 0 ? AUD0.format(mtd.target) : "—"} target
								</span>
							</div>

							{/* Progress bar */}
							<div className='h-2 w-full overflow-hidden rounded-full bg-muted'>
								<div
									className={`h-full ${
										Number(mtd.target) > 0 ? "bg-primary" : "bg-neutral-600/40"
									}`}
									style={{ width: `${(mtd.percent * 100).toFixed(1)}%` }}
								/>
							</div>
						</>
					)}
				</CardFooter>
			</Card>

			{/* ---------------- Card 2: East Sales ---------------- */}
			<Card className='@container/card' data-slot='card'>
				<CardHeader>
					<CardDescription>East Sales</CardDescription>
					<CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-4xl'>
						{east.loading ? "…" : AUD0.format(east.value || 0)}
					</CardTitle>
					<CardAction>
						{east.error ? (
							<Badge variant='outline'>Error</Badge>
						) : east.delta != null ? (
							<Badge variant='outline' className={badgeClassesForDelta(east.delta)}>
								{getTrend(east.delta) === "up" ? (
									<IconTrendingUp />
								) : getTrend(east.delta) === "down" ? (
									<IconTrendingDown />
								) : (
									<IconMinus />
								)}
								{pctStr(east.delta)}
							</Badge>
						) : null}
					</CardAction>
				</CardHeader>
				<CardFooter className='flex-col items-start gap-1.5 text-sm'>
					{east.error ? (
						<>
							<div className='font-medium'>Couldn’t load East.</div>
							<div className='text-muted-foreground'>{east.error}</div>
						</>
					) : (
						<>
							{/* % of target */}
							<div className='mb-1 text-xs text-muted-foreground tabular-nums'>
								{Number(east.target) > 0 ? `${Math.round(east.percent * 100)}%` : "—"}{" "}
								<span className='text-muted-foreground'>
									of {Number(east.target) > 0 ? AUD0.format(east.target) : "—"} target
								</span>
							</div>

							{/* Progress bar */}
							<div className='h-2 w-full overflow-hidden rounded-full bg-muted'>
								<div
									className={`h-full ${
										Number(east.target) > 0 ? "bg-primary" : "bg-neutral-600/40"
									}`}
									style={{ width: `${(east.percent * 100).toFixed(1)}%` }}
								/>
							</div>
						</>
					)}
				</CardFooter>
			</Card>

			{/* ---------------- Card 3: West Sales ---------------- */}
			<Card className='@container/card' data-slot='card'>
				<CardHeader>
					<CardDescription>West Sales</CardDescription>
					<CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-4xl'>
						{west.loading ? "…" : AUD0.format(west.value || 0)}
					</CardTitle>
					<CardAction>
						{west.error ? (
							<Badge variant='outline'>Error</Badge>
						) : west.delta != null ? (
							<Badge variant='outline' className={badgeClassesForDelta(west.delta)}>
								{getTrend(west.delta) === "up" ? (
									<IconTrendingUp />
								) : getTrend(west.delta) === "down" ? (
									<IconTrendingDown />
								) : (
									<IconMinus />
								)}
								{pctStr(west.delta)}
							</Badge>
						) : null}
					</CardAction>
				</CardHeader>
				<CardFooter className='flex-col items-start gap-1.5 text-sm'>
					{west.error ? (
						<>
							<div className='font-medium'>Couldn’t load West.</div>
							<div className='text-muted-foreground'>{west.error}</div>
						</>
					) : (
						<>
							{/* % of target */}
							<div className='mb-1 text-xs text-muted-foreground tabular-nums'>
								{Number(west.target) > 0 ? `${Math.round(west.percent * 100)}%` : "—"}{" "}
								<span className='text-muted-foreground'>
									of {Number(west.target) > 0 ? AUD0.format(west.target) : "—"} target
								</span>
							</div>

							{/* Progress bar */}
							<div className='h-2 w-full overflow-hidden rounded-full bg-muted'>
								<div
									className={`h-full ${
										Number(west.target) > 0 ? "bg-primary" : "bg-neutral-600/40"
									}`}
									style={{ width: `${(west.percent * 100).toFixed(1)}%` }}
								/>
							</div>
						</>
					)}
				</CardFooter>
			</Card>

			{/* ---------------- Card 4: Online Sales ---------------- */}
			<Card className='@container/card' data-slot='card'>
				<CardHeader>
					<CardDescription>Online Sales</CardDescription>
					<CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-4xl'>
						{online.loading ? "…" : AUD0.format(online.value || 0)}
					</CardTitle>
					<CardAction>
						{online.error ? (
							<Badge variant='outline'>Error</Badge>
						) : online.delta != null ? (
							<Badge variant='outline' className={badgeClassesForDelta(online.delta)}>
								{getTrend(online.delta) === "up" ? (
									<IconTrendingUp />
								) : getTrend(online.delta) === "down" ? (
									<IconTrendingDown />
								) : (
									<IconMinus />
								)}
								{pctStr(online.delta)}
							</Badge>
						) : null}
					</CardAction>
				</CardHeader>
				<CardFooter className='flex-col items-start gap-1.5 text-sm'>
					{online.error ? (
						<>
							<div className='font-medium'>Couldn’t load Online.</div>
							<div className='text-muted-foreground'>{online.error}</div>
						</>
					) : (
						<>
							{/* % of target */}
							<div className='mb-1 text-xs text-muted-foreground tabular-nums'>
								{Number(online.target) > 0 ? `${Math.round(online.percent * 100)}%` : "—"}{" "}
								<span className='text-muted-foreground'>
									of {Number(online.target) > 0 ? AUD0.format(online.target) : "—"} target
								</span>
							</div>

							{/* Progress bar */}
							<div className='h-2 w-full overflow-hidden rounded-full bg-muted'>
								<div
									className={`h-full ${
										Number(online.target) > 0 ? "bg-primary" : "bg-neutral-600/40"
									}`}
									style={{ width: `${(online.percent * 100).toFixed(1)}%` }}
								/>
							</div>
						</>
					)}
				</CardFooter>
			</Card>
		</div>
	);
}
