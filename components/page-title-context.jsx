"use client";
import React from "react";

const PageTitleCtx = React.createContext(null);

export function PageTitleProvider({ children, defaultTitle = "Pulse Home" }) {
	// Stable default so SSR and the first client render match
	const [title, setTitle] = React.useState(defaultTitle);
	const value = React.useMemo(() => ({ title, setTitle, defaultTitle }), [title, defaultTitle]);
	return <PageTitleCtx.Provider value={value}>{children}</PageTitleCtx.Provider>;
}

export function usePageTitle() {
	const ctx = React.useContext(PageTitleCtx);
	if (!ctx) throw new Error("usePageTitle must be used within a SidebarProvider");
	return ctx;
}
