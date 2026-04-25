"use client";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Hospital, Lock, ArrowLeft, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import LoadingComponents from "@/components/LoadingComponents";
import { toast } from "@/hooks/use-toast";

export default function Component() {
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [step, setStep] = useState("signin"); // 'signin', 'otp', 'mfa', or 'confirmation'
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();
  const { data: session, status } = useSession();

  // Consolidated redirect logic - runs only once
  useEffect(() => {
    // If already authenticated, redirect immediately without delay
    if (status === "authenticated" && session) {
      router.replace("/dashboard");
    }
    // OTP field auto-focus - combined with first effect
    if (step === "otp") {
      otpRefs.current[0]?.focus();
    }
    // Confirmation redirect after showing success message
    if (step === "confirmation") {
      const timer = setTimeout(() => {
        router.replace("/dashboard");
      }, 1500); // Reduced from 2000ms for faster UX
      return () => clearTimeout(timer);
    }
  }, [status, session, step, router]);

  const requestOtp = async () => {
    setOtpLoading(true);

    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          purpose: "signin",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Failed to send OTP.");
      }

      toast({
        title: "OTP Sent",
        description: "A verification code has been sent to your email.",
      });

      setStep("otp");
      setOtpValues(["", "", "", "", "", ""]);
      setError("");
    } catch (requestError: unknown) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Failed to send OTP. Please try again.";

      toast({
        title: "Unable to Send OTP",
        description: message,
        variant: "destructive",
      });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtpValues = [...otpValues];
      newOtpValues[index] = value;
      setOtpValues(newOtpValues);

      if (value && index < 5) {
        otpRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (step === "signin") {
      await requestOtp();
    } else if (step === "otp") {
      const otp = otpValues.join("");
      if (otp.length !== 6) {
        setError("Please enter a valid 6-digit OTP.");
        return;
      }

      setLoading(true);
      try {
        const verifyResponse = await fetch("/api/auth/otp/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            otp,
            purpose: "signin",
          }),
        });

        const verifyResult = await verifyResponse.json();
        if (!verifyResponse.ok) {
          throw new Error(verifyResult?.error || "OTP verification failed.");
        }

        const res = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (res?.error) {
          throw new Error(res.error);
        }

        setStep("confirmation");
      } catch (submitError: unknown) {
        console.error("Sign in error:", submitError);
        setStep("error");

        const message =
          submitError instanceof Error
            ? submitError.message
            : "An error occurred during login. Please try again.";

        toast({
          title: "Login Failed",
          description: message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !resetEmail.includes("@") || !resetEmail.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }
    // Simulate password reset email send
    alert(`Password reset link sent to ${resetEmail}`);
    setIsDialogOpen(false);
    setResetEmail("");
  };
  const renderError = () => (
    <motion.div
      className="flex flex-col items-center justify-center h-full"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="rounded-full bg-red-700 p-2 mb-4"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 500, damping: 30 }}
      >
        <X className="h-10 w-10 text-white" />
      </motion.div>
      <motion.h2
        className="text-2xl font-bold text-center mb-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        Login Failed
      </motion.h2>
      <motion.p
        className="text-center text-gray-600"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Button
          variant="outline"
          onClick={() => {
            setStep("signin"); // Reset state to "signin"
            setEmail(""); // Clear email input
            setPassword(""); // Clear password input
            setOtpValues(["", "", "", "", "", ""]); // Clear OTP input if necessary
          }}
          className="text-white"
        >
          Retry?
        </Button>
      </motion.p>
    </motion.div>
  );
  const renderConfirmation = () => (
    <motion.div
      className="flex flex-col items-center justify-center h-full"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="rounded-full bg-green-500 p-2 mb-4"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 500, damping: 30 }}
      >
        <Check className="h-10 w-10 text-white" />
      </motion.div>
      <motion.h2
        className="text-2xl font-bold text-center mb-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        Login Successful
      </motion.h2>
      <motion.p
        className="text-center text-gray-600"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        Redirecting to dashboard...
      </motion.p>
    </motion.div>
  );

  return (
    <div className={`bg-muted/40 `}>
      <div className="items-end flex flex-col space-y-2 p-5">
      </div>
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <Hospital className="h-12 w-12 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">
              Hospital Sign In
            </CardTitle>
            <CardDescription className="flex justify-center space-x-4">
              Don&apos;t have an account?{" "}
              <Link className="hover:underline" href={"/auth/signup"}>
                Signup
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === "confirmation" ? (
              renderConfirmation()
            ) : step === "error" ? (
              renderError()
            ) : (
              <>
                <form onSubmit={handleSubmit}>
                  {step === "signin" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="email">Hospital Email</Label>
                        <Input
                          id="email"
                          placeholder="hospital@example.com"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                      </div>
                    </>
                  )}
                  {step === "otp" && (
                    <div className="space-y-2">
                      <Label htmlFor="otp">Enter OTP</Label>
                      <div className="flex justify-between">
                        {otpValues.map((value, index) => (
                          <Input
                            key={index}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            className="w-12 h-12 text-center text-lg"
                            value={value}
                            onChange={(e) =>
                              handleOtpChange(index, e.target.value)
                            }
                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                            ref={(el) => {
                              otpRefs.current[index] =
                                el as HTMLInputElement | null;
                            }}
                            required
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  <Button
                    className="w-full mt-4"
                    type="submit"
                    disabled={otpLoading}
                  >
                    {step === "signin" ? (
                      otpLoading ? (
                        <LoadingComponents />
                      ) : (
                        "Sign In"
                      )
                    ) : step === "otp" ? (
                      loading === false ? (
                        "Verify OTP"
                      ) : (
                        <LoadingComponents />
                      )
                    ) : null}
                  </Button>
                </form>
                {step !== "signin" && (
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={requestOtp}
                      disabled={otpLoading || loading}
                    >
                      {otpLoading ? "Sending..." : "Resend OTP"}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setStep("signin");
                        setOtpValues(["", "", "", "", "", ""]);
                      }}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sign In
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <div className="flex items-center justify-center w-full">
              {step === "signin" ? (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="link"
                      className="text-sm text-red-600 hover:underline"
                    >
                      Forgot password?
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Reset Password</DialogTitle>
                      <DialogDescription>
                        Enter your email address and we&apos;ll send you a link
                        to reset your password.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleForgotPassword}>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="reset-email" className="text-right">
                            Email
                          </Label>
                          <Input
                            id="reset-email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            className="col-span-3"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit">Send Reset Link</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              ) : null}
            </div>
            <div className="flex items-center justify-center w-full">
              <Lock className="h-4 w-4 mr-2 text-gray-500" />
              <span className="text-sm text-gray-500">Secure Sign-In</span>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
