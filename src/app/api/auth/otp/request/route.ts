import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/config/prisma.config";
import { sendMail } from "@/lib/mailer";
import {
  OTP_RESEND_COOLDOWN_MS,
  OtpPurpose,
  createOtpSessionValue,
  generateOtpCode,
  getOtpCookieName,
  isEmailValid,
  readOtpSessionValue,
} from "@/lib/otp";
import { getMissingTableMessage, isMissingTableError } from "@/lib/prismaErrors";

type RequestBody = {
  email?: string;
  purpose?: OtpPurpose;
  password?: string;
};

const getOtpMailTemplate = (otp: string, purpose: OtpPurpose) => {
  const actionText = purpose === "signin" ? "sign in" : "complete your registration";

  return {
    subject: "Your MediNexus verification code",
    text: `Your OTP code is ${otp}. It is valid for 10 minutes. Use this code to ${actionText}.`,
    html: `<p>Your OTP code is <strong>${otp}</strong>.</p><p>It is valid for <strong>10 minutes</strong>.</p><p>Use this code to ${actionText}.</p>`,
  };
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const email = body.email?.trim().toLowerCase();
    const purpose = body.purpose;

    if (!email || !purpose || !["signin", "signup"].includes(purpose)) {
      return NextResponse.json(
        { error: "Invalid request payload." },
        { status: 400 }
      );
    }

    if (!isEmailValid(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    if (purpose === "signin") {
      if (!body.password) {
        return NextResponse.json(
          { error: "Password is required for sign in OTP." },
          { status: 400 }
        );
      }

      const user = await prisma.hospital.findUnique({
        where: { admin_email: email },
        select: { password: true },
      });

      if (!user) {
        return NextResponse.json(
          { error: "Invalid email or password." },
          { status: 401 }
        );
      }

      const isPasswordMatched = await bcrypt.compare(body.password, user.password);
      if (!isPasswordMatched) {
        return NextResponse.json(
          { error: "Invalid email or password." },
          { status: 401 }
        );
      }
    }

    const cookieStore = cookies();
    const cookieName = getOtpCookieName(purpose);
    const existingCookie = cookieStore.get(cookieName)?.value;
    const existing = readOtpSessionValue(existingCookie);

    if (existing && existing.email === email) {
      const now = Date.now();
      const elapsed = now - existing.lastSentAt;

      if (elapsed < OTP_RESEND_COOLDOWN_MS) {
        const retryAfterSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);

        return NextResponse.json(
          {
            error: `Please wait ${retryAfterSeconds}s before requesting a new OTP.`,
          },
          { status: 429 }
        );
      }
    }

    const otp = generateOtpCode();
    const cookieValue = createOtpSessionValue({ otp, email, purpose });
    const { subject, text, html } = getOtpMailTemplate(otp, purpose);

    let deliveredVia: "email" | "dev-console" = "email";

    try {
      await sendMail({
        to: email,
        subject,
        text,
        html,
      });
    } catch (mailError: any) {
      const isDevelopment = process.env.NODE_ENV !== "production";
      const allowDevFallback = process.env.OTP_ALLOW_DEV_FALLBACK !== "false";

      if (isDevelopment && allowDevFallback) {
        deliveredVia = "dev-console";
        console.warn(
          `[OTP DEV FALLBACK] Could not send email. Using console OTP for ${email}: ${otp}`
        );
      } else {
        const errorCode = mailError?.code;
        const errorMessage = String(mailError?.message || "").toLowerCase();

        if (errorCode === "EAUTH") {
          return NextResponse.json(
            {
              error:
                "Email authentication failed. Use a valid SMTP app password in EMAIL_PASS.",
            },
            { status: 503 }
          );
        }

        if (errorMessage.includes("not configured")) {
          return NextResponse.json(
            {
              error:
                "Email service is not configured. Set EMAIL_USER and EMAIL_PASS in environment.",
            },
            { status: 503 }
          );
        }

        throw mailError;
      }
    }

    cookieStore.set(cookieName, cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    });

    return NextResponse.json({
      message:
        deliveredVia === "email"
          ? "OTP sent successfully."
          : "OTP generated in development mode. Check server logs for code.",
    });
  } catch (error) {
    console.error("OTP request error:", error);

    if (isMissingTableError(error)) {
      return NextResponse.json(
        { error: getMissingTableMessage(error) },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to send OTP. Please try again." },
      { status: 500 }
    );
  }
}
