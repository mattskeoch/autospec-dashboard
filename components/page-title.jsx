"use client";
import { useEffect } from "react";
import { usePageTitle } from "@/components/page-title-context";

export default function PageTitle({ title }) {
	const { setTitle } = usePageTitle();
	useEffect(() => {
		setTitle(title);
		return () => setTitle("");
	}, [title, setTitle]);
	return null;
}
