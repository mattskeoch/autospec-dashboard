"use client";

import { memo, useMemo } from "react";

/* ---------- formatting ---------- */
const AUD0 = new Intl.NumberFormat("en-AU", {
	style: "currency",
	currency: "AUD",
	maximumFractionDigits: 0,
});
const INT0 = new Intl.NumberFormat("en-AU", { maximumFractionDigits: 0 });

const fmtAUD = (n) => AUD0.format(Number(n || 0));
const fmtAUDNoSymbol = (n) => INT0.format(Number(n || 0));
const clamp = (v) => Math.max(0, Math.min(1, Number(v || 0)));
const pctStr = (p) => `${Math.round(clamp(p) * 100)}%`;

/* ---------- helpers ---------- */
const colorForProgress = (p) => {
	const x = clamp(p);
	if (x >= 1) return "bg-primary";
	if (x >= 0.5) return "bg-amber-400 dark:bg-amber-300";
	return "bg-rose-400 dark:bg-rose-300";
};

const targetFrom = (value, progress) => {
	const p = Number(progress || 0);
	const v = Number(value || 0);
	if (!isFinite(p) || p <= 0) return 0;
	const t = v / p;
	return isFinite(t) ? Math.max(0, t) : 0;
};

/* ---------- tiny ui bits ---------- */
function Bar({ value }) {
	const p = clamp(value);
	const color = colorForProgress(p);
	return (
		<div className='h-1.5 w-full overflow-hidden rounded-full bg-muted'>
			<div className={`h-full ${color}`} style={{ width: `${(p * 100).toFixed(1)}%` }} />
		</div>
	);
}

/* ---------- row ---------- */
function RepRow({ r }) {
	const salesTarget = targetFrom(r.sales, r.salesProgress);
	const depTarget = targetFrom(r.deposits, r.depositProgress);

	return (
		<div className='grid grid-cols-12 items-center gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-muted/50'>
			{/* Rep */}
			<div className='col-span-4 sm:col-span-3'>
				<div className='text-xs text-muted-foreground'>Rep</div>
				<div className='truncate font-semibold text-foreground'>{r.rep || "Unassigned"}</div>
				<div className='text-xs text-muted-foreground/80'>Sales count: {r.salesCount ?? 0}</div>
			</div>

			{/* Sales */}
			<div className='col-span-4 sm:col-span-2'>
				<div className='text-xs text-muted-foreground'>Sales</div>
				<div className='mt-0.5'>
					<span className='mr-1 align-top text-muted-foreground'>$</span>
					<span className='tabular-nums font-semibold text-foreground'>
						{fmtAUDNoSymbol(r.sales)}
					</span>
				</div>
			</div>

			{/* Deposits */}
			<div className='col-span-4 sm:col-span-2'>
				<div className='text-xs text-muted-foreground'>Deposits</div>
				<div className='mt-0.5'>
					<span className='mr-1 align-top text-muted-foreground'>$</span>
					<span className='tabular-nums font-semibold text-foreground'>
						{fmtAUDNoSymbol(r.deposits)}
					</span>
				</div>
			</div>

			{/* Progress (sales + deposits) */}
			<div className='col-span-12 sm:col-span-5'>
				<div className='grid grid-cols-2 gap-3'>
					{/* Sales progress */}
					<div>
						<div className='mb-1 flex items-center justify-between'>
							<span className='text-[11px] text-muted-foreground'>Sales</span>
							<span className='text-[11px] text-muted-foreground tabular-nums'>
								{pctStr(r.salesProgress)}
							</span>
						</div>
						<div className='mb-1 text-[12px] text-muted-foreground/90'>
							<span className='mr-1 align-top text-muted-foreground'>$</span>
							<span className='tabular-nums text-foreground'>{fmtAUDNoSymbol(r.sales)}</span>
							<span className='mx-1 text-muted-foreground/60'>/</span>
							{salesTarget > 0 ? (
								<>
									<span className='mr-1 align-top text-muted-foreground'>$</span>
									<span className='tabular-nums text-foreground'>
										{fmtAUDNoSymbol(salesTarget)}
									</span>
								</>
							) : (
								<span>—</span>
							)}
						</div>
						<Bar value={r.salesProgress} />
					</div>

					{/* Deposit progress */}
					<div>
						<div className='mb-1 flex items-center justify-between'>
							<span className='text-[11px] text-muted-foreground'>Deposits</span>
							<span className='text-[11px] text-muted-foreground tabular-nums'>
								{pctStr(r.depositProgress)}
							</span>
						</div>
						<div className='mb-1 text-[12px] text-muted-foreground/90'>
							<span className='mr-1 align-top text-muted-foreground'>$</span>
							<span className='tabular-nums text-foreground'>{fmtAUDNoSymbol(r.deposits)}</span>
							<span className='mx-1 text-muted-foreground/60'>/</span>
							{depTarget > 0 ? (
								<>
									<span className='mr-1 align-top text-muted-foreground'>$</span>
									<span className='tabular-nums text-foreground'>{fmtAUDNoSymbol(depTarget)}</span>
								</>
							) : (
								<span>—</span>
							)}
						</div>
						<Bar value={r.depositProgress} />
					</div>
				</div>
			</div>
		</div>
	);
}

/* ---------- table ---------- */
function RepTable({ rows = [] }) {
	const sorted = useMemo(() => [...rows].sort((a, b) => (b.sales || 0) - (a.sales || 0)), [rows]);

	return (
		<div className='rounded-2xl border bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/50 shadow-sm p-3 sm:p-4 lg:p-6'>
			{/* header */}
			<div className='mb-2 grid grid-cols-12 gap-4 rounded-xl px-3 py-2 text-xs text-muted-foreground'>
				<div className='col-span-4 sm:col-span-3'>Rep</div>
				<div className='col-span-4 sm:col-span-2'>Sales</div>
				<div className='col-span-4 sm:col-span-2'>Deposits</div>
				<div className='col-span-12 sm:col-span-5'>Progress</div>
			</div>

			{sorted.length ? (
				<div className='space-y-1'>
					{sorted.map((r, i) => (
						<RepRow key={r.rep || i} r={r} />
					))}
				</div>
			) : (
				<div className='rounded-xl p-6 text-sm text-muted-foreground'>No rows yet.</div>
			)}
		</div>
	);
}

export default memo(RepTable);
