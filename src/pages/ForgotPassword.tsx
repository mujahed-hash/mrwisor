import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Logo } from "@/components/Logo";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, ArrowLeft, Mail, KeyRound, Lock } from "lucide-react";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp";

const API_URL = '/api';

// Step 1: Email form
const emailSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email address" }),
});

// Step 2: OTP verification (handled separately)

// Step 3: New password
const passwordSchema = z.object({
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

type Step = 'email' | 'otp' | 'password' | 'success';

export default function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState<Step>('email');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [resetToken, setResetToken] = useState("");
    const [codeSentAt, setCodeSentAt] = useState<Date | null>(null);
    const [canResend, setCanResend] = useState(false);
    const [countdown, setCountdown] = useState(60);

    // Email form
    const emailForm = useForm<z.infer<typeof emailSchema>>({
        resolver: zodResolver(emailSchema),
        defaultValues: { email: "" },
    });

    // Password form
    const passwordForm = useForm<z.infer<typeof passwordSchema>>({
        resolver: zodResolver(passwordSchema),
        defaultValues: { password: "", confirmPassword: "" },
    });

    // Countdown timer for resend
    useEffect(() => {
        if (!codeSentAt) return;

        const timer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - codeSentAt.getTime()) / 1000);
            const remaining = 60 - elapsed;

            if (remaining <= 0) {
                setCanResend(true);
                setCountdown(0);
                clearInterval(timer);
            } else {
                setCountdown(remaining);
                setCanResend(false);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [codeSentAt]);

    // Step 1: Send OTP
    async function onEmailSubmit(values: z.infer<typeof emailSchema>) {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: values.email }),
            });

            const data = await response.json();

            setEmail(values.email);
            setCodeSentAt(new Date());
            setCanResend(false);
            setCountdown(60);
            setStep('otp');
        } catch (err: any) {
            setError(err.message || "Failed to send reset code");
        } finally {
            setIsLoading(false);
        }
    }

    // Resend OTP
    async function handleResend() {
        if (!canResend) return;

        setIsLoading(true);
        setError(null);

        try {
            await fetch(`${API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            setCodeSentAt(new Date());
            setCanResend(false);
            setCountdown(60);
            setOtp("");
        } catch (err: any) {
            setError("Failed to resend code");
        } finally {
            setIsLoading(false);
        }
    }

    // Step 2: Verify OTP
    async function handleVerifyOTP() {
        if (otp.length !== 6) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/auth/verify-reset-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Invalid code');
            }

            setResetToken(data.resetToken);
            setStep('password');
        } catch (err: any) {
            setError(err.message || "Invalid code");
        } finally {
            setIsLoading(false);
        }
    }

    // Step 3: Reset password
    async function onPasswordSubmit(values: z.infer<typeof passwordSchema>) {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resetToken, newPassword: values.password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to reset password');
            }

            setStep('success');
        } catch (err: any) {
            setError(err.message || "Failed to reset password");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <div className="flex justify-center mb-6">
                        <Logo size="md" />
                    </div>

                    {step === 'email' && (
                        <>
                            <CardTitle className="text-2xl font-bold text-center">Forgot Password</CardTitle>
                            <CardDescription className="text-center">
                                Enter your email to receive a reset code
                            </CardDescription>
                        </>
                    )}

                    {step === 'otp' && (
                        <>
                            <CardTitle className="text-2xl font-bold text-center">Verify Code</CardTitle>
                            <CardDescription className="text-center">
                                Enter the 6-digit code sent to {email}
                            </CardDescription>
                        </>
                    )}

                    {step === 'password' && (
                        <>
                            <CardTitle className="text-2xl font-bold text-center">New Password</CardTitle>
                            <CardDescription className="text-center">
                                Create a new password for your account
                            </CardDescription>
                        </>
                    )}

                    {step === 'success' && (
                        <>
                            <CardTitle className="text-2xl font-bold text-center text-green-600">
                                Password Reset!
                            </CardTitle>
                            <CardDescription className="text-center">
                                Your password has been successfully updated
                            </CardDescription>
                        </>
                    )}
                </CardHeader>

                <CardContent>
                    {error && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Step 1: Email */}
                    {step === 'email' && (
                        <Form {...emailForm}>
                            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                                <FormField
                                    control={emailForm.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        placeholder="you@example.com"
                                                        type="email"
                                                        className="pl-10"
                                                        {...field}
                                                        disabled={isLoading}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? "Sending..." : "Send Reset Code"}
                                </Button>
                            </form>
                        </Form>
                    )}

                    {/* Step 2: OTP */}
                    {step === 'otp' && (
                        <div className="space-y-6">
                            <div className="flex justify-center">
                                <InputOTP
                                    maxLength={6}
                                    value={otp}
                                    onChange={(value) => setOtp(value)}
                                >
                                    <InputOTPGroup>
                                        <InputOTPSlot index={0} />
                                        <InputOTPSlot index={1} />
                                        <InputOTPSlot index={2} />
                                        <InputOTPSlot index={3} />
                                        <InputOTPSlot index={4} />
                                        <InputOTPSlot index={5} />
                                    </InputOTPGroup>
                                </InputOTP>
                            </div>

                            <Button
                                onClick={handleVerifyOTP}
                                className="w-full"
                                disabled={isLoading || otp.length !== 6}
                            >
                                {isLoading ? "Verifying..." : "Verify Code"}
                            </Button>

                            <div className="text-center">
                                {canResend ? (
                                    <Button variant="link" onClick={handleResend} disabled={isLoading}>
                                        Resend Code
                                    </Button>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Resend code in {countdown}s
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 3: New Password */}
                    {step === 'password' && (
                        <Form {...passwordForm}>
                            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                                <FormField
                                    control={passwordForm.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>New Password</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        placeholder="••••••••"
                                                        type="password"
                                                        className="pl-10"
                                                        {...field}
                                                        disabled={isLoading}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={passwordForm.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Confirm Password</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        placeholder="••••••••"
                                                        type="password"
                                                        className="pl-10"
                                                        {...field}
                                                        disabled={isLoading}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? "Resetting..." : "Reset Password"}
                                </Button>
                            </form>
                        </Form>
                    )}

                    {/* Step 4: Success */}
                    {step === 'success' && (
                        <div className="text-center space-y-4">
                            <div className="flex justify-center">
                                <CheckCircle className="h-16 w-16 text-green-500" />
                            </div>
                            <Button onClick={() => navigate('/login')} className="w-full">
                                Go to Login
                            </Button>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="flex flex-col space-y-2">
                    {step !== 'success' && (
                        <div className="text-sm text-center text-muted-foreground">
                            <Link to="/login" className="text-primary hover:underline inline-flex items-center gap-1">
                                <ArrowLeft className="h-3 w-3" /> Back to Login
                            </Link>
                        </div>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
