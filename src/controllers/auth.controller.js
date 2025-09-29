import prisma from "../../prisma/prisma.js";
import {
  generateOtp,
  hashOtp,
  hashPassword,
} from "../services/auth.service.js";
import { SignUpSchema } from "../validations/auth.validation.js";
import { sendEmail } from "../services/email.service.js";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library.js";

export const checkUsername = async (req, res) => {
  try {
    const username = req.query.username;
    if (!username)
      return res.status(400).json({ message: "username is required!" });

    const existingUser = await prisma.user.findFirst({
      where: { username },
    });
    return res.status(200).json({ available: !existingUser });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const signUp = async (req, res) => {
  try {
    const body = await req.body;
    const validationResult = SignUpSchema.safeParse(body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Invalid input data",
        errors: validationResult.error.issues,
      });
    }
    const { email, name, password, username } = validationResult.data;

    const existingUserByEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUserByEmail) {
      if (existingUserByEmail.isVerified) {
        return res
          .status(409)
          .json({ message: "Email already exists and verified! Please login" });
      }

      const updates = {};
      if (existingUserByEmail.name !== name) {
        updates.name = name;
      }
      if (password) {
        updates.password = await hashPassword(password);
      }

      if (Object.keys(updates).length > 0) {
        await prisma.user.update({
          where: { id: existingUserByEmail.id },
          data: updates,
        });
      }

      if (existingUserByEmail.username !== username) {
        const existingUserByUsername = await prisma.user.findUnique({
          where: { username },
        });
        if (existingUserByUsername) {
          return res.status(409).json({
            message: "Username already exists! Please choose a different one",
          });
        }
        await prisma.user.update({
          where: { id: existingUserByEmail.id },
          data: { username },
        });
      }

      const otp = generateOtp();
      const hashedOtp = await hashOtp(otp);
      await prisma.$transaction(async (tx) => {
        await tx.oneTimePassword.deleteMany({
          where: { userId: existingUserByEmail.id, type: "EMAIL_VERIFICATION" },
        });
        await tx.oneTimePassword.create({
          data: {
            userId: existingUserByEmail.id,
            type: "EMAIL_VERIFICATION",
            otp: hashedOtp,
          },
        });
      });
      await sendEmail(email, "EMAIL_VERIFICATION", otp);
      return res.status(200).json({
        message: "Verification email resent successfully",
        user: { ...existingUserByEmail, ...updates, username },
      });
    }

    const existingUserByUsername = await prisma.user.findUnique({
      where: { username },
    });
    if (existingUserByUsername) {
      return res.status(409).json({ message: "Username already exists!" });
    }
    const otp = generateOtp();
    const hashedOtp = await hashOtp(otp);
    const hashedPassword = await hashPassword(password);
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          username,
          email,
          password: hashedPassword,
        },
      });
      await tx.oneTimePassword.create({
        data: {
          userId: newUser.id,
          type: "EMAIL_VERIFICATION",
          otp: hashedOtp,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });
      return newUser;
    });
    await sendEmail(email, "EMAIL_VERIFICATION", otp);
    return res.status(201).json({ message: "User created successfully", user });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      return res.status(409).json({ message: "Database conflict occurred" });
    }
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const body = await req.body;
    const validationResult = VerifyOtpSchema.safeParse(body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Invalid input data",
        errors: validationResult.error.issues,
      });
    }
    const { email, otp } = validationResult.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }
    if (existingUser.isVerified) {
      return res.status(400).json({ message: "User is already verified" });
    }

    const otpRecord = await prisma.oneTimePassword.findFirst({
      where: {
        userId: existingUser.id,
        type: "EMAIL_VERIFICATION",
        expiresAt: { gt: new Date() },
      },
    });
    if (!otpRecord) {
      return res
        .status(404)
        .json({ message: "Valid OTP not found or expired" });
    }
    if (otpRecord.attempts >= 5) {
      return res.status(429).json({
        message: "Too many failed attempts. Please request a new OTP.",
      });
    }

    const isOtpValid = await comparePassword(otp, otpRecord.otp);
    if (!isOtpValid) {
      await prisma.oneTimePassword.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      return res.status(401).json({ message: "Invalid OTP" });
    }
    const { accessToken, refreshToken } = await generateTokens(
      existingUser.id,
      existingUser.username,
      existingUser.email
    );
    if (!accessToken || !refreshToken) {
      return res.status(500).json({ message: "Failed to generate tokens" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existingUser.id },
        data: { isVerified: true },
      });
      await tx.oneTimePassword.deleteMany({
        where: { userId: existingUser.id, type: "EMAIL_VERIFICATION" },
      });
      await tx.refreshToken.deleteMany({
        where: { userId: existingUser.id },
      });
      await tx.refreshToken.create({
        data: {
          userId: existingUser.id,
          refreshToken,
        },
      });
    });

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 15 * 60 * 1000,
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({ message: "User verified successfully" });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      return res.status(409).json({ message: "Database conflict occurred" });
    }
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const resendVerificationOtp = async (req, res) => {
  try {
    const body = await req.body;
    const validationResult = ResendOtpSchema.safeParse(body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Invalid input data",
        errors: validationResult.error.issues,
      });
    }
    const { email } = validationResult.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }
    if (existingUser.isVerified) {
      return res.status(400).json({ message: "User is already verified" });
    }

    const otp = generateOtp();
    const hashedOtp = await hashOtp(otp);
    await prisma.$transaction(async (tx) => {
      await tx.oneTimePassword.deleteMany({
        where: { userId: existingUser.id, type: "EMAIL_VERIFICATION" },
      });
      await tx.oneTimePassword.create({
        data: {
          userId: existingUser.id,
          type: "EMAIL_VERIFICATION",
          otp: hashedOtp,
        },
      });
    });

    await sendEmail(email, "EMAIL_VERIFICATION", otp);
    return res
      .status(200)
      .json({ message: "Verification email resent successfully" });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      return res.status(409).json({ message: "Database conflict occurred" });
    }
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
