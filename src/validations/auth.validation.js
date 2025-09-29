import { z } from "zod";

export const SignUpSchema = z.object({
  name: z.string().min(1, "Name is required"),
  username: z
    .string()
    .min(1, "Username is required")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    ),
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export const VerifyOtpSchema = z.object({
  otp: z
    .string()
    .min(6, "OTP must be at least 6 characters long")
    .max(6, "OTP must not be more than 6 characters long"),
  email: z.email("Invalid email address"),
});

export const ResendOtpSchema = z.object({
  email: z.email("Invalid email address"),
})

export const LoginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})
