"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

export const Progress = React.forwardRef(({ className, value = 0, ...props }, ref) => {
	const v = Math.max(0, Math.min(100, Number(value) || 0));
	return (
		<ProgressPrimitive.Root
			ref={ref}
			className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}
			{...props}
		>
			<ProgressPrimitive.Indicator
				className='h-full w-full flex-1 bg-primary transition-transform'
				style={{ transform: `translateX(-${100 - v}%)` }}
			/>
		</ProgressPrimitive.Root>
	);
});
Progress.displayName = "Progress";
