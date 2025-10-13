"use client";

import { useEffect, useState } from "react";
import { fetchJSON, API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function StatusCheck() {
	const [state, setState] = useState({ loading: true, ok: false, data: null, error: null });

	async function run() {
		setState((s) => ({ ...s, loading: true, error: null }));
		try {
			const data = await fetchJSON("status"); // hits `${NEXT_PUBLIC_API_BASE}/status`
			setState({ loading: false, ok: true, data, error: null });
		} catch (err) {
			setState({ loading: false, ok: false, data: null, error: err?.message || String(err) });
		}
	}

	useEffect(() => {
		run();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div className='rounded-lg border p-4 space-y-3'>
			<div className='text-sm text-muted-foreground'>
				API base: <code className='text-foreground'>{API_BASE || "(relative)"}</code>
			</div>

			{state.loading ? (
				<div className='text-sm'>Checking API status…</div>
			) : state.ok ? (
				<div className='space-y-2'>
					<div className='text-sm font-medium'>✅ API reachable</div>
					<pre className='text-xs overflow-auto rounded-md bg-muted p-3'>
						{JSON.stringify(state.data, null, 2)}
					</pre>
				</div>
			) : (
				<div className='space-y-2'>
					<div className='text-sm font-medium text-destructive'>❌ API error</div>
					<pre className='text-xs overflow-auto rounded-md bg-muted p-3'>{state.error}</pre>
				</div>
			)}

			<div className='flex gap-2'>
				<Button size='sm' onClick={run} disabled={state.loading}>
					Retry
				</Button>
			</div>
		</div>
	);
}
