"use client";

import PageTitle from "@/components/page-title";
import { SectionCards } from "@/components/section-cards";
import ChartSalesBySource from "@/components/chart-sales-by-source";
import ChartAreaRolling7d from "@/components/chart-area-rolling7d";
import Podium from "@/components/podium";
import HighlightsTiles from "@/components/highlights-tiles";
import RepTablePreview from "@/components/rep-table-preview";
import StatusCheck from "@/components/status-check";

export default function Page() {
	return (
		<>
			<PageTitle title='Pulse Home' />
			<div className='flex flex-1 flex-col'>
				<div className='p-4 space-y-4'>
					<h1 className='text-xl font-semibold'>Autospec v2 — API Wiring</h1>
					<StatusCheck />
				</div>
			</div>
		</>
	);
}
