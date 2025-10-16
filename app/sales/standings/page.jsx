"use client";

import PageTitle from "@/components/page-title";
import RepTableContainer from "@/components/rep-table-container";

export default function SalesStandingPage() {
	return (
		<>
			<PageTitle title='Standings' />
			<div className='flex flex-1 flex-col'>
				<div className='@container/main flex flex-1 flex-col gap-2'>
					<div className='flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6'>
						<RepTableContainer />
					</div>
				</div>{" "}
			</div>
		</>
	);
}
