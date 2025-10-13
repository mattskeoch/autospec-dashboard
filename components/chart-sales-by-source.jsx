"use client";

import * as React from "react";
import { TrendingUp } from "lucide-react";
import { Label, Pie, PieChart } from "recharts";
import { fetchJSON } from "@/lib/api";

import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	ChartLegend,
	ChartLegendContent,
} from "@/components/ui/chart";

/* ---------- classification helpers (tolerant to field names) ---------- */
function isOnline(row) {
	const tags = String(row?.tags || "");
	const src = String(row?.source || "");
	const online =
		row?.is_online === true || /online store/i.test(tags) || src.trim().toLowerCase() === "online";
	return online;
}

function isPartner(row) {
	const tags = String(row?.tags || "");
	const src = String(row?.source || "");
	return /partner/i.test(tags) || src.trim().toLowerCase() === "partner";
}

function regionOf(row) {
	const sr = String(row?.store_region || "").toLowerCase();
	if (sr === "east" || sr === "west") return sr;
	const src = String(row?.source || "").toLowerCase();
	if (src === "east" || src === "west") return src;
	return ""; // unknown
}

export default function ChartSalesBySource() {
	const [state, setState] = React.useState({
		loading: true,
		error: "",
		east: 0,
		west: 0,
		online: 0,
		partner: 0,
		total: 0,
		asOf: "",
	});

	React.useEffect(() => {
		let alive = true;
		(async () => {
			try {
				const rows = await fetchJSON("sales-log"); // expects an array or {rows: [...]}
				if (!alive) return;

				const list = Array.isArray(rows) ? rows : Array.isArray(rows?.rows) ? rows.rows : [];

				let east = 0,
					west = 0,
					online = 0,
					partner = 0;

				for (const r of list) {
					if (isPartner(r)) {
						partner++;
						continue;
					}
					if (isOnline(r)) {
						online++;
						continue;
					}
					const reg = regionOf(r);
					if (reg === "east") east++;
					else if (reg === "west") west++;
					// else: skip (unknown source)
				}

				const total = east + west + online + partner;

				setState({
					loading: false,
					error: "",
					east,
					west,
					online,
					partner,
					total,
					asOf: rows?.as_of || "",
				});
			} catch (e) {
				setState((s) => ({
					...s,
					loading: false,
					error: e?.message || String(e),
				}));
			}
		})();
		return () => {
			alive = false;
		};
	}, []);

	const chartData = React.useMemo(
		() => [
			{ source: "east", name: "East", count: state.east, fill: "var(--chart-1)" },
			{ source: "west", name: "West", count: state.west, fill: "var(--chart-2)" },
			{ source: "online", name: "Online", count: state.online, fill: "var(--chart-3)" },
			{ source: "partner", name: "Partner", count: state.partner, fill: "var(--chart-4)" },
		],
		[state.east, state.west, state.online, state.partner]
	);

	return (
		<Card className='flex flex-col'>
			<CardHeader className='items-center pb-0'>
				<CardTitle>Sales Count by Source</CardTitle>
				{/* <CardDescription>{state.asOf ? `As of ${state.asOf}` : "Month-to-date"}</CardDescription> */}
			</CardHeader>

			<CardContent className='flex-1 pb-0'>
				<ChartContainer
					config={{
						count: { label: "Sales" },
						east: { label: "East", color: "var(--chart-1)" },
						west: { label: "West", color: "var(--chart-2)" },
						online: { label: "Online", color: "var(--chart-3)" },
						partner: { label: "Partner", color: "var(--chart-4)" },
					}}
					className='mx-auto aspect-square max-h-[260px]'
				>
					<PieChart>
						<ChartTooltip cursor={false} content={<ChartTooltipContent />} />
						<Pie
							data={chartData}
							dataKey='count'
							nameKey='source'
							innerRadius={60}
							outerRadius={90}
							strokeWidth={10}
							isAnimationActive={true}
							animationBegin={100}
							animationDuration={900}
							animationEasing='ease-out'
						>
							<Label
								content={({ viewBox }) => {
									if (viewBox && "cx" in viewBox && "cy" in viewBox) {
										const cx = viewBox.cx;
										const cy = viewBox.cy;
										return (
											<text x={cx} y={cy} textAnchor='middle' dominantBaseline='middle'>
												<tspan className='fill-foreground text-3xl font-bold'>
													{Number(state.total || 0).toLocaleString()}
												</tspan>
												<tspan x={cx} y={(cy || 0) + 24} className='fill-muted-foreground'>
													Sales
												</tspan>
											</text>
										);
									}
									return null;
								}}
							/>
						</Pie>{" "}
						<ChartLegend
							content={<ChartLegendContent nameKey='source' />}
							className='-translate-y-0 flex-wrap gap-2 *:basis-1/4 *:justify-center'
						/>
					</PieChart>{" "}
				</ChartContainer>
			</CardContent>

			{/* <CardFooter className='flex-col gap-2 text-sm'>
				{state.error ? (
					<div className='text-destructive'>Error: {state.error}</div>
				) : (
					<>
						<div className='flex items-center gap-2 leading-none font-medium'>
							Breakdown of East / West / Online / Partner
							<TrendingUp className='h-4 w-4' />
						</div>
						<div className='text-muted-foreground leading-none'>
							Center shows total MTD sales count
						</div>
					</>
				)}
			</CardFooter> */}
		</Card>
	);
}
