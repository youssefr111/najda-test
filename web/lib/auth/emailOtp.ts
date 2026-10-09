import { apiFetch } from "@/lib/api/client";
import { Gender } from "@/types/user";

export type SendEmailOtpResponse = { resendAfterSeconds: number; expiresInSeconds: number };
export type VerifyEmailOtpResponse = { verificationToken: string; validForSeconds: number };

export type RegisterWithPasswordPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  verificationToken: string;
  phone: string;
  address: string;
  gender: Gender;
};

const post = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) });

export const sendEmailOtp = (email: string) =>
  post<SendEmailOtpResponse>("/api/auth/register/otp/send", { email });

export const verifyEmailOtp = (email: string, code: string) =>
  post<VerifyEmailOtpResponse>("/api/auth/register/otp/verify", { email, code });

export const registerCitizenWithPassword = (payload: RegisterWithPasswordPayload) =>
  post("/api/auth/register/citizen/password", payload);