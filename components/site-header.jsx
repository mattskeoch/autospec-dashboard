"use client";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import { usePageTitle } from "@/components/page-title-context";

export function SiteHeader() {
	const { title } = usePageTitle();
	return (
		<header className='flex h-(--header-height) shrink-0 items-center gap-2 border-b'>
			<div className='flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6'>
				<SidebarTrigger className='-ml-1' />
				<Separator orientation='vertical' className='mx-2 data-[orientation=vertical]:h-4' />
				<h1 className='text-base font-medium'>{title}</h1>
				<div className='ml-auto flex items-center gap-2'>
					<ModeToggle />
				</div>
			</div>
		</header>
	);
}
