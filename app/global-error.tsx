"use client";

import { Geist } from "next/font/google";
import { XCircle } from "lucide-react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.className} antialiased`}>
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-sm">
            <div className="rounded-xl border bg-card text-card-foreground shadow">
              <div className="flex flex-col space-y-1.5 p-6 text-center">
                <XCircle className="mx-auto h-12 w-12 text-destructive" />
                <div className="font-semibold leading-none tracking-tight text-2xl">
                  Something went wrong
                </div>
              </div>
              <div className="p-6 pt-0">
                <p className="text-sm text-muted-foreground text-center">
                  A critical error occurred. Please try refreshing the page.
                </p>
              </div>
              <div className="flex items-center p-6 pt-0 flex-col gap-3">
                <button
                  onClick={reset}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
