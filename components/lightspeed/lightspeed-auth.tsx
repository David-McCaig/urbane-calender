"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AuthButton from "@/components/lightspeed/auth-button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Lock } from "lucide-react";

function LoginContent() {
    const searchParams = useSearchParams();
    const reason = searchParams.get("reason");

    // Determine the appropriate message based on the reason
    const getReasonMessage = () => {
        switch (reason) {
            case "expired":
                return {
                    title: "Session Expired",
                    description: "Your session has expired. Please sign in again to access the work order bumper."
                };
            case "invalid":
                return {
                    title: "Invalid Session",
                    description: "Your session is no longer valid. Please sign in again to access the work order bumper."
                };
            case "unauthorized":
                return {
                    title: "Access Required",
                    description: "Please sign in to access the work order bumper."
                };
            default:
                return {
                    title: "Sign In Required",
                    description: "Please sign in to access the work order bumper."
                };
        }
    };

    const reasonInfo = getReasonMessage();

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="container mx-auto max-w-md">
                {/* Header */}
                <div className="mb-6 text-center">
                    <h1 className="text-2xl font-bold tracking-tight mb-2">
                        {reasonInfo.title}
                    </h1>
                    <p className="text-muted-foreground">
                        {reasonInfo.description}
                    </p>
                </div>

                {/* Main Content */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lock className="h-5 w-5" />
                            Access Work Order Bumper
                        </CardTitle>
                        <CardDescription>
                            Sign in with your Lightspeed account to continue
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Alert className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Your authentication has expired. Please sign in again to access the work order bumper.
                            </AlertDescription>
                        </Alert>
                        
                        <AuthButton />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default function Page() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background p-8">
                <div className="container mx-auto max-w-md">
                    <div className="mb-6 text-center">
                        <h1 className="text-2xl font-bold tracking-tight mb-2">
                            Loading...
                        </h1>
                    </div>
                </div>
            </div>
        }>
            <LoginContent />
        </Suspense>
    )
}