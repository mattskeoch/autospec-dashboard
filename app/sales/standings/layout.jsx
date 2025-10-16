import { ThemeProvider } from "@/components/theme-provider";

export const metadata = {
	title: "Sales",
	description: "Sales dashboards and logs",
};

export default function Standingslayout({ children }) {
	return (
		<ThemeProvider attribute='class' defaultTheme='system' enableSystem disableTransitionOnChange>
			{children}
		</ThemeProvider>
	);
}
