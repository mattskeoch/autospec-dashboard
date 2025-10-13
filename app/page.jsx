import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import ChartSalesBySource from "@/components/chart-sales-by-source";
import ChartAreaMTD from "@/components/chart-area-mtd";
import StatusCheck from "@/components/status-check";

import data from "./data.json";

export default function Page() {
	return (
		<SidebarProvider
			style={{
				"--sidebar-width": "calc(var(--spacing) * 72)",
				"--header-height": "calc(var(--spacing) * 12)",
			}}
		>
			<AppSidebar variant='inset' />
			<SidebarInset>
				<SiteHeader />
				<div className='flex flex-1 flex-col'>
					<div className='@container/main flex flex-1 flex-col gap-2'>
						<div className='flex flex-col gap-4 py-4 md:gap-6 md:py-6'>
							<SectionCards />
							<div className='grid grid-cols-1 md:grid-cols-5 gap-4 px-4 lg:px-6'>
								<div className='col-span-1 md:col-span-3'>
									<ChartAreaMTD />
								</div>
								<div className='col-span-1 md:col-span-1'>
									<ChartSalesBySource />
								</div>
							</div>
							<DataTable data={data} />
						</div>
					</div>
					<div className='p-4 space-y-4'>
						<h1 className='text-xl font-semibold'>Autospec v2 — API Wiring</h1>
						<StatusCheck />
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
