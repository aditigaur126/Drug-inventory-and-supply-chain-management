import { createHash, createHmac, randomInt } from "crypto";

export type OtpPurpose = "signin" | "signup";

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

export type OtpSessionPayload = {
  email: string;
  purpose: OtpPurpose;
  otpHash: string;
  createdAt: number;
  lastSentAt: number;
  expiresAt: number;
  attempts: number;
};

type SignedOtpEnvelope = {
  payload: OtpSessionPayload;
  signature: string;
};

const OTP_SECRET =
  process.env.OTP_SECRET || process.env.NEXTAUTH_SECRET || "dev-insecure-otp-secret";

export const getOtpCookieName = (purpose: OtpPurpose) =>
  `medinexus_otp_${purpose}`;

export const isEmailValid = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const generateOtpCode = () =>
  randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");

const hashOtp = (otp: string, email: string, purpose: OtpPurpose) =>
  createHash("sha256")
    .update(`${otp}:${email.toLowerCase()}:${purpose}:${OTP_SECRET}`)
    .digest("hex");

const signPayload = (payload: OtpSessionPayload) =>
  createHmac("sha256", OTP_SECRET)
    .update(JSON.stringify(payload))
    .digest("hex");

export const createOtpSessionValue = ({
  otp,
  email,
  purpose,
  now,
}: {
  otp: string;
  email: string;
  purpose: OtpPurpose;
  now?: number;
}) => {
  const nowTs = now ?? Date.now();

  const payload: OtpSessionPayload = {
    email: email.toLowerCase(),
    purpose,
    otpHash: hashOtp(otp, email, purpose),
    createdAt: nowTs,
    lastSentAt: nowTs,
    expiresAt: nowTs + OTP_TTL_MS,
    attempts: 0,
  };

  const envelope: SignedOtpEnvelope = {
    payload,
    signature: signPayload(payload),
  };

  return Buffer.from(JSON.stringify(envelope)).toString("base64url");
};

export const readOtpSessionValue = (value: string | undefined | null) => {
  if (!value) {
    return null;
  }

  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const envelope = JSON.parse(decoded) as SignedOtpEnvelope;

    if (!envelope?.payload || !envelope.signature) {
      return null;
    }

    const expected = signPayload(envelope.payload);
    if (expected !== envelope.signature) {
      return null;
    }

    return envelope.payload;
  } catch {
    return null;
  }
};

export const updateOtpSessionValue = (payload: OtpSessionPayload) => {
  const envelope: SignedOtpEnvelope = {
    payload,
    signature: signPayload(payload),
  };

  return Buffer.from(JSON.stringify(envelope)).toString("base64url");
};

export const verifyOtpCode = ({
  otp,
  payload,
}: {
  otp: string;
  payload: OtpSessionPayload;
}) => hashOtp(otp, payload.email, payload.purpose) === payload.otpHash;
