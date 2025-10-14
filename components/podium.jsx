"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import useRepTop3 from "@/hooks/use-rep-top3";
import {
	Card,
	CardAction,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { fetchJSON } from "@/lib/api";
import { IconTrophy } from "@tabler/icons-react";

/* ------------------------------ formatters ------------------------------ */
const AUD0 = new Intl.NumberFormat("en-AU", {
	style: "currency",
	currency: "AUD",
	maximumFractionDigits: 0,
});
const AUD_COMPACT = new Intl.NumberFormat("en-AU", {
	style: "currency",
	currency: "AUD",
	notation: "compact",
	maximumFractionDigits: 1,
});

/* ------------------------------ helpers ------------------------------ */
function initials(name) {
	const parts = String(name || "")
		.trim()
		.split(/\s+/)
		.slice(0, 2);
	return parts.map((p) => p[0]?.toUpperCase() || "").join("");
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

/** Read a rep name from various possible shapes */
function repFromRow(r) {
	return (
		r?.rep ||
		r?.salesperson ||
		r?.sales_person ||
		r?.salesPerson ||
		r?.employee ||
		r?.assignee ||
		""
	);
}

/** Pick an amount field from various shapes */
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

/** Pick a date field from various shapes */
function rawDateOf(r) {
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

/* Medal glows (no emojis) */
function glowForRank(rank) {
	if (rank === 1)
		return "bg-[radial-gradient(120%_120%_at_50%_30%,rgba(251,191,36,0.26),rgba(251,191,36,0.10)_42%,transparent_70%)]";
	if (rank === 2)
		return "bg-[radial-gradient(120%_120%_at_50%_30%,rgba(206,212,218,0.22),rgba(206,212,218,0.08)_42%,transparent_70%)]";
	return "bg-[radial-gradient(120%_120%_at_50%_30%,rgba(205,127,50,0.20),rgba(205,127,50,0.07)_42%,transparent_70%)]";
}

function SparklesBackground({ tone = "amber" }) {
	const rgb = tone === "amber" ? "251,191,36" : "180,180,255";

	// stable positions so dots don't reshuffle
	const dots = useMemo(
		() =>
			Array.from({ length: 24 }).map((_, i) => ({
				left: (i * 137) % 100,
				top: (i * 263 + 17) % 100,
				delay: (i % 10) * 0.22,
				dur: 6 + ((i * 37) % 30) / 10, // 6.0–9.9s
				size: 1 + ((i * 53) % 10) / 10, // 1.0–1.9px
				op: 0.25 + ((i * 19) % 20) / 100, // 0.25–0.44
			})),
		[]
	);

	return (
		<div className='pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[18px]'>
			{/* ultra-subtle drifting starfield (so nothing is “fixed”) */}
			<div className='absolute -inset-[12%] field' />
			<style jsx>{`
				@keyframes pan {
					0% {
						transform: translate3d(0, 0, 0);
					}
					50% {
						transform: translate3d(-3%, -2%, 0);
					}
					100% {
						transform: translate3d(0, 0, 0);
					}
				}
				.field {
					opacity: 0.18;
					background-size: 28px 28px;
					background-repeat: repeat;
					-webkit-mask-image: radial-gradient(60% 60% at 50% 40%, #000 60%, transparent 100%);
					mask-image: radial-gradient(60% 60% at 50% 40%, #000 60%, transparent 100%);
					background-image: radial-gradient(
							circle at 12px 8px,
							rgba(${rgb}, 0.28) 1px,
							transparent 1.1px
						),
						radial-gradient(circle at 22px 18px, rgba(${rgb}, 0.18) 1px, transparent 1.1px),
						radial-gradient(circle at 6px 22px, rgba(${rgb}, 0.16) 1px, transparent 1.1px);
					filter: drop-shadow(0 0 5px rgba(${rgb}, 0.25));
					animation: pan 24s ease-in-out infinite;
				}
				@media (prefers-reduced-motion: reduce) {
					.field {
						animation: none;
					}
				}
			`}</style>

			{/* floating twinkles (primary effect) */}
			{dots.map((d, i) => (
				<motion.span
					key={i}
					className='absolute rounded-full'
					style={{
						left: `${d.left}%`,
						top: `${d.top}%`,
						width: `${d.size}px`,
						height: `${d.size}px`,
						backgroundColor: `rgba(${rgb},0.75)`,
						boxShadow: `0 0 8px rgba(${rgb},0.5)`,
					}}
					initial={{ opacity: 0 }}
					animate={{ opacity: [0, d.op, 0], y: [0, -12, 0], scale: [1, 1.25, 1] }}
					transition={{ duration: d.dur, delay: d.delay, repeat: Infinity, ease: "easeInOut" }}
				/>
			))}
		</div>
	);
}

/* ------------------------------ component ------------------------------ */
export default function Podium() {
	const { loading, error, top3, fmtAUD, shareOf } = useRepTop3();

	// Best single-day total this month per rep (AUD)
	const [bestDayByRep, setBestDayByRep] = useState({}); // { "Jane Doe": 12400, ... }

	useEffect(() => {
		let alive = true;
		(async () => {
			try {
				const sl = await fetchJSON("sales-log"); // proxy: /api/sales-log
				if (!alive) return;
				const list = Array.isArray(sl) ? sl : Array.isArray(sl?.rows) ? sl.rows : [];
				const prefix = monthPrefixPerth(new Date());

				// Map rep -> Map(ymd -> sum)
				const perRepPerDay = new Map();

				for (const r of list) {
					const name = String(repFromRow(r) || "").trim();
					if (!name) continue;

					const raw = rawDateOf(r);
					if (!raw) continue;

					const ymd = /^\d{4}-\d{2}-\d{2}$/.test(String(raw)) ? String(raw) : perthYMD(raw);
					if (!ymd.startsWith(prefix)) continue; // only this month

					const amt = amountOf(r);
					if (!Number.isFinite(amt) || amt <= 0) continue;

					if (!perRepPerDay.has(name)) perRepPerDay.set(name, new Map());
					const dayMap = perRepPerDay.get(name);
					dayMap.set(ymd, (dayMap.get(ymd) || 0) + amt);
				}

				// Find max day per rep
				const best = {};
				for (const [rep, dayMap] of perRepPerDay.entries()) {
					let max = 0;
					for (const v of dayMap.values()) max = Math.max(max, v || 0);
					best[rep] = max;
				}

				setBestDayByRep(best);
			} catch {
				// silently ignore; component still renders without best-day line
			}
		})();
		return () => {
			alive = false;
		};
	}, []);

	const podiumCols = useMemo(() => {
		// Arrange visually as [2nd, 1st, 3rd]
		const [first, second, third] = top3;
		return [second, first, third].filter(Boolean);
	}, [top3]);

	// Loading / error / empty states
	if (loading) {
		return (
			<div className='grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-3'>
				{[0, 1, 2].map((i) => (
					<Card key={i} className='@container/card' data-slot='card'>
						<CardHeader>
							<CardDescription>&nbsp;</CardDescription>
							<CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
								…
							</CardTitle>
						</CardHeader>
						<CardFooter className='flex-col items-start gap-1.5 text-sm'>
							<div className='h-2 w-full overflow-hidden rounded-full bg-muted'>
								<div className='h-full w-1/2 animate-pulse bg-muted-foreground/20' />
							</div>
						</CardFooter>
					</Card>
				))}
			</div>
		);
	}

	if (error || podiumCols.length === 0) {
		return (
			<Card className='mx-4 lg:mx-6'>
				<CardHeader>
					<CardTitle>Top Reps</CardTitle>
					<CardDescription>Month to date</CardDescription>
				</CardHeader>
				<CardFooter className='text-sm text-muted-foreground'>
					{error ? `Failed to load reps: ${error}` : "No salesperson data yet this month."}
				</CardFooter>
			</Card>
		);
	}

	return (
		<div className='grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-3'>
			{podiumCols.map((rep, idx) => {
				// Determine actual rank (1st is center, then left/right)
				const rank = rep === top3[0] ? 1 : rep === top3[1] ? 2 : 3;
				const share = shareOf(rep);
				const repName = String(rep?.rep || rep?.name || "").trim();
				const bestDay = Number(bestDayByRep[repName] || 0);

				// Title size emphasis to mirror podium feel
				const titleEmphasis = rank === 1 ? " @[250px]/card:text-4xl" : " @[250px]/card:text-3xl";

				return (
					<Card
						key={`${rank}-${repName || idx}`}
						className={cn(
							"@container/card relative isolate",
							"data-[slot=card]:bg-gradient-to-t data-[slot=card]:from-primary/5 data-[slot=card]:to-card",
							"shadow-xs"
						)}
						data-slot='card'
					>
						{rank === 1 ? <SparklesBackground tone='amber' /> : null}

						{/* single glow layer */}
						<div
							aria-hidden
							className={cn(
								"pointer-events-none absolute inset-0 -z-10 rounded-[18px] opacity-30 blur-2xl",
								glowForRank(rank)
							)}
						/>

						<CardHeader className='relative z-10'>
							{/* Header: avatar + name */}
							<div className='flex items-center gap-3'>
								<Avatar className='h-9 w-9 ring-1 ring-border'>
									<AvatarImage src={undefined} alt={repName || "Rep"} />
									<AvatarFallback className='text-xs'>{initials(repName || "Rep")}</AvatarFallback>
								</Avatar>

								<div className='min-w-0'>
									<CardDescription title={repName} className='truncate'>
										{repName || "Unassigned"}
									</CardDescription>
									{/* Best day line */}
									<div className='mt-0.5 text-xs text-muted-foreground'>
										Best day:{" "}
										<span className='tabular-nums'>
											{bestDay > 0 ? AUD_COMPACT.format(bestDay) : "—"}
										</span>
									</div>
								</div>
							</div>

							{/* Big figure (amount) — animated text */}
							<CardTitle className={cn("text-2xl font-semibold tabular-nums", titleEmphasis)}>
								<motion.span
									initial={{ opacity: 0, y: 8 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.35, delay: 0.08 * idx }}
								>
									{AUD0.format(Number(rep?.sales || 0))}
								</motion.span>
							</CardTitle>

							{/* Action: Trophy only for 1st — pop-in */}
							<CardAction>
								{rank === 1 ? (
									<motion.div
										initial={{ scale: 0.8, opacity: 0 }}
										animate={{ scale: 1, opacity: 1 }}
										transition={{ duration: 0.25, delay: 0.12 * idx, ease: "easeOut" }}
									>
										<Badge
											variant='outline'
											className='border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300'
										>
											<IconTrophy />
											Top
										</Badge>
									</motion.div>
								) : null}
							</CardAction>
						</CardHeader>

						<CardFooter className='relative z-10 flex-col items-start gap-1.5 text-sm'>
							{/* % of team share */}
							<div className='mb-1 text-xs text-muted-foreground tabular-nums'>
								{Math.round(share * 100)}%{" "}
								<span className='text-muted-foreground'>of team MTD</span>
							</div>

							{/* Progress bar — animated fill */}
							<div className='h-2 w-full overflow-hidden rounded-full bg-muted'>
								<motion.div
									className='h-full bg-primary'
									initial={{ width: "0%" }}
									animate={{ width: `${(share * 100).toFixed(1)}%` }}
									transition={{ duration: 0.9, ease: "easeOut", delay: 0.12 * idx }}
								/>
							</div>
						</CardFooter>
					</Card>
				);
			})}
		</div>
	);
}
