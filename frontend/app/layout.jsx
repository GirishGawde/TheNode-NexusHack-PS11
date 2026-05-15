import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/ThemeProvider";
import ThemeToggle from "@/components/shared/ThemeToggle";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "NexusHack",
  description: "End-to-end Hackathon Management Platform",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans" style={{ background: "var(--bg)", color: "var(--text-primary)" }}>
        <ThemeProvider>
          {children}
          <ThemeToggle />
          <Toaster position="top-center" toastOptions={{ className: 'bg-black text-white border border-white/10' }} />
        </ThemeProvider>
      </body>
    </html>
  );
}
