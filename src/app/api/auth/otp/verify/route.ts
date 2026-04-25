import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  OTP_MAX_ATTEMPTS,
  OtpPurpose,
  getOtpCookieName,
  isEmailValid,
  readOtpSessionValue,
  updateOtpSessionValue,
  verifyOtpCode,
} from "@/lib/otp";

type RequestBody = {
  email?: string;
  purpose?: OtpPurpose;
  otp?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const email = body.email?.trim().toLowerCase();
    const purpose = body.purpose;
    const otp = body.otp?.trim();

    if (!email || !purpose || !otp || !["signin", "signup"].includes(purpose)) {
      return NextResponse.json(
        { error: "Invalid verification payload." },
        { status: 400 }
      );
    }

    if (!isEmailValid(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: "OTP must be a valid 6-digit code." },
        { status: 400 }
      );
    }

    const cookieStore = cookies();
    const cookieName = getOtpCookieName(purpose);
    const otpCookie = cookieStore.get(cookieName)?.value;
    const session = readOtpSessionValue(otpCookie);

    if (!session || session.email !== email || session.purpose !== purpose) {
      return NextResponse.json(
        { error: "OTP session not found. Please request a new OTP." },
        { status: 400 }
      );
    }

    const now = Date.now();
    if (now > session.expiresAt) {
      cookieStore.delete(cookieName);
      return NextResponse.json(
        { error: "OTP expired. Please request a new OTP." },
        { status: 400 }
      );
    }

    if (session.attempts >= OTP_MAX_ATTEMPTS) {
      cookieStore.delete(cookieName);
      return NextResponse.json(
        { error: "Too many invalid attempts. Please request a new OTP." },
        { status: 429 }
      );
    }

    const isVerified = verifyOtpCode({ otp, payload: session });

    if (!isVerified) {
      const updatedSession = {
        ...session,
        attempts: session.attempts + 1,
      };

      cookieStore.set(cookieName, updateOtpSessionValue(updatedSession), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: Math.max(1, Math.floor((session.expiresAt - now) / 1000)),
      });

      const attemptsLeft = OTP_MAX_ATTEMPTS - updatedSession.attempts;

      return NextResponse.json(
        {
          error:
            attemptsLeft > 0
              ? `Invalid OTP. ${attemptsLeft} attempt(s) left.`
              : "Invalid OTP.",
        },
        { status: 400 }
      );
    }

    cookieStore.delete(cookieName);

    return NextResponse.json({
      message: "OTP verified successfully.",
      verified: true,
    });
  } catch (error) {
    console.error("OTP verify error:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP. Please try again." },
      { status: 500 }
    );
  }
}
