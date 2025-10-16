"use client";

import PageTitle from "@/components/page-title";
import { SectionCards } from "@/components/section-cards";
import ChartSalesBySource from "@/components/chart-sales-by-source";
import ChartAreaRolling7d from "@/components/chart-area-rolling7d";
import Podium from "@/components/podium";
import HighlightsTiles from "@/components/highlights-tiles";
import RepTablePreview from "@/components/rep-table-preview";
import StatusCheck from "@/components/status-check";

export default function SalesHome() {
	return (
		<>
			<PageTitle title='Sales' />
			<div className='flex flex-1 flex-col'>
				<div className='@container/main flex flex-1 flex-col gap-2'>
					<div className='flex flex-col gap-4 py-4 md:gap-6 md:py-6'>
						<SectionCards />
						<div className='grid grid-cols-1 md:grid-cols-5 gap-4 px-4 lg:px-6'>
							<div className='col-span-1 md:col-span-3'>
								<ChartAreaRolling7d />
							</div>
							<div className='col-span-1 md:col-span-2'>
								<ChartSalesBySource />
							</div>
						</div>
						<Podium />
						<div className='grid grid-cols-1 md:grid-cols-6 gap-4 px-4 lg:px-6'>
							<div className='col-span-1 md:col-span-3'>
								<RepTablePreview limit={5} hrefFull='/reps' />
							</div>
							<div className='col-span-1 md:col-span-3'>
								<HighlightsTiles />
							</div>
						</div>
					</div>
				</div>
				<div className='p-4 space-y-4'>
					<h1 className='text-xl font-semibold'>Autospec v2 — API Wiring</h1>
					<StatusCheck />
				</div>
			</div>
		</>
	);
}
