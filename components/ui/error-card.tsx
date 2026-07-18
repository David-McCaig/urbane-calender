"use client";

import { useEffect } from "react";
import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ErrorCardProps {
  error: Error & { digest?: string };
  reset?: () => void;
  title?: string;
  message?: string;
  homeHref?: string;
}

export function ErrorCard({
  error,
  reset,
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  homeHref = "/",
}: ErrorCardProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <CardTitle className="text-2xl">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              {message}
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            {reset && (
              <Button onClick={reset} className="w-full">
                Try again
              </Button>
            )}
            <Button variant="outline" className="w-full" asChild>
              <Link href={homeHref}>Go home</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
