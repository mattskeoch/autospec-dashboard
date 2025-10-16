"use client";

import * as React from "react";
import Link from "next/link";
import { fetchJSON } from "@/lib/api";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";

/* ---------- helpers ---------- */
const AUD0 = new Intl.NumberFormat("en-AU", {
	style: "currency",
	currency: "AUD",
	maximumFractionDigits: 0,
});

function sanitizeRow(r = {}) {
	const s = (v) =>
		v == null
			? ""
			: typeof v === "object"
			? "value" in v && v.value != null
				? String(v.value)
				: typeof v.toISOString === "function"
				? v.toISOString().slice(0, 10)
				: v && typeof v.name === "string"
				? v.name
				: String(v)
			: String(v);
	const n = (v) => (Number.isFinite(+v) ? +v : 0);

	return {
		date: s(r.date),
		salesperson: s(r.salesperson || r.salesPerson || r.sales_person || r.rep || ""),
		orderTotal: n(r.orderTotal ?? r.total ?? r.amount ?? 0),
		amountPaid: n(r.amountPaid ?? r.deposit ?? 0),
		owner: s(r.owner),
		created_by_name: s(r.created_by_name),
		created_by: s(r.created_by?.name),
		processed_by: s(r.processed_by),
		cashier: s(r.cashier),
		staff_name: s(r.staff_name ?? r.staff?.name),
		user_name: s(r.user?.name),
	};
}

function resolveRepName(row) {
	const c = [
		row.salesperson,
		row.owner,
		row.created_by_name,
		row.created_by,
		row.processed_by,
		row.cashier,
		row.staff_name,
		row.user_name,
	];
	const name = c.find((x) => typeof x === "string" && x.trim());
	return (name || "Unassigned").trim();
}

const TZ = "Australia/Perth";
function perthYMD(d) {
	return new Date(d).toLocaleDateString("en-CA", { timeZone: TZ });
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

/* ---------- component ---------- */
export default function RepTablePreview({ limit = 5, hrefFull = "/reps" }) {
	const [mounted, setMounted] = React.useState(false);
	const [rows, setRows] = React.useState([]);
	const [draftsMap, setDraftsMap] = React.useState(new Map()); // rep(lowercase) -> MTD draft count
	const [err, setErr] = React.useState("");

	React.useEffect(() => setMounted(true), []);

	React.useEffect(() => {
		let alive = true;
		(async () => {
			try {
				// 1) Sales/deposits source (existing)
				const raw = await fetchJSON("sales-log");
				if (!alive) return;
				const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.rows) ? raw.rows : [];
				setRows(arr.map(sanitizeRow));
			} catch (e) {
				setErr(e?.message || String(e));
				setRows([]);
			}
		})();
		return () => {
			alive = false;
		};
	}, []);

	React.useEffect(() => {
		let alive = true;
		(async () => {
			try {
				// 2) Drafts per-rep MTD
				// Assumes your Cloud Run added endpoint:
				// GET /drafts/rep-table  -> { rows: [{rep: "Name", drafts_mtd: <number>, ... }], as_of: ... }
				const resp = await fetchJSON("drafts/rep-table");
				if (!alive) return;
				const r = Array.isArray(resp) ? resp : Array.isArray(resp?.rows) ? resp.rows : [];
				const m = new Map();
				for (const row of r) {
					const rep = (
						row.rep ||
						row.salesperson ||
						row.salesPerson ||
						row.sales_person ||
						""
					).toString();
					const key = rep.trim().toLowerCase() || "unassigned";
					const drafts = Number(row.drafts_mtd ?? row.drafts ?? row.count ?? row.total ?? 0) || 0;
					if (!m.has(key)) m.set(key, 0);
					m.set(key, (m.get(key) || 0) + drafts);
				}
				setDraftsMap(m);
			} catch (e) {
				// Non-fatal: keep drafts at 0 if endpoint not available yet
				console.warn("drafts/rep-table fetch failed:", e?.message || e);
				setDraftsMap(new Map());
			}
		})();
		return () => {
			alive = false;
		};
	}, []);

	const data = React.useMemo(() => {
		const prefix = monthPrefixPerth(new Date());
		const perRep = new Map(); // rep -> { sales, deposits }

		const isUnassigned = (s) => {
			const t = String(s || "").trim();
			return !t || t.toLowerCase() === "unassigned" || t === "—";
		};

		for (const r of rows) {
			const ymd = /^\d{4}-\d{2}-\d{2}$/.test(String(r.date)) ? String(r.date) : perthYMD(r.date);
			if (!ymd.startsWith(prefix)) continue;

			const rep = resolveRepName(r);
			if (isUnassigned(rep)) continue;
			if (!perRep.has(rep)) perRep.set(rep, { sales: 0, deposits: 0 });
			const acc = perRep.get(rep);
			if (r.orderTotal > 0) acc.sales += r.orderTotal;
			if (r.amountPaid > 0) acc.deposits += r.amountPaid;
		}

		// Merge in drafts counts (by lowercase key)
		const out = Array.from(perRep, ([rep, v]) => {
			const key = rep.trim().toLowerCase() || "unassigned";
			const drafts = draftsMap.get(key) || 0;
			return { rep, sales: v.sales, deposits: v.deposits, drafts };
		})
			.filter((r) => !isUnassigned(r.rep)) // extra safety
			.sort((a, b) => b.sales - a.sales)
			.slice(0, limit + 3);

		return out;
	}, [rows, draftsMap, limit]);

	const columns = React.useMemo(
		() => [
			{
				id: "rank",
				header: () => <span className='text-xs text-muted-foreground'>Rank</span>,
				cell: ({ row }) => (
					<span className='inline-block w-6 text-center tabular-nums text-muted-foreground'>
						{row.index + 1}
					</span>
				),
				enableSorting: false,
				enableHiding: false,
			},
			{
				accessorKey: "rep",
				header: () => <span className='text-xs text-muted-foreground'>Rep</span>,
				cell: ({ row }) => <span className='font-medium'>{row.original.rep}</span>,
			},
			{
				accessorKey: "sales",
				header: () => <span className='text-xs text-muted-foreground'>Sales</span>,
				cell: ({ row }) => <span className='tabular-nums'>{AUD0.format(row.original.sales)}</span>,
			},
			{
				accessorKey: "deposits",
				header: () => <span className='text-xs text-muted-foreground'>Deposits</span>,
				cell: ({ row }) => (
					<span className='tabular-nums'>{AUD0.format(row.original.deposits)}</span>
				),
			},
			{
				id: "drafts",
				header: () => <span className='text-xs text-muted-foreground'>Drafts</span>,
				cell: ({ row }) => <span className='tabular-nums'>{Number(row.original.drafts || 0)}</span>,
				enableSorting: false,
				enableHiding: false,
			},
		],
		[]
	);

	const table = useReactTable({
		data,
		columns,
		initialState: { sorting: [{ id: "sales", desc: true }] },
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	if (!mounted) return null;

	return (
		<div className='w-full'>
			{/* Condensed table — no Card wrapper */}
			<div className='overflow-hidden rounded-lg border'>
				<Table>
					<TableHeader className='bg-card/50 sticky top-0 z-10'>
						{table.getHeaderGroups().map((hg) => (
							<TableRow key={hg.id}>
								{hg.headers.map((h) => (
									<TableHead key={h.id} className='py-2 first:pl-4 last:pr-4'>
										{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody className='text-sm'>
						{table.getRowModel().rows.length ? (
							table.getRowModel().rows.map((r) => (
								<TableRow key={r.id} className='bg-card'>
									{r.getVisibleCells().map((cell, i, arr) => (
										<TableCell
											key={cell.id}
											className={`py-2 ${i === 0 ? "pl-4" : ""} ${
												i === arr.length - 1 ? "pr-4" : ""
											}`}
											data-slot='table-cell'
										>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className='h-16 text-center text-muted-foreground'
								>
									{err ? `Error: ${err}` : "No data for this month yet."}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{/* Link under table */}
			<div className='mt-3 flex w-full justify-end'>
				<Link
					href={hrefFull || "/reps"}
					className='text-sm font-medium text-primary hover:underline underline-offset-4'
				>
					View full report →
				</Link>
			</div>
		</div>
	);
}
