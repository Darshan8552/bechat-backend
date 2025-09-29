import { compare, hash } from "bcryptjs"
import { SignJWT } from "jose"
export async function hashPassword(password) {
    return await hash(password, 12)
}

export async function comparePassword(password, hashedPassword) {
    return await compare(password, hashedPassword)
}

export async function hashOtp(otp) {
    return await hash(otp, 12)
}

export async function compareOtp(otp, hashedOtp) {
    return await compare(otp, hashedOtp)
}

export function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

const JWT_ACCESS_TOKEN = process.env.JWT_ACCESS_TOKEN
const JWT_REFRESH_TOKEN = process.env.JWT_REFRESH_TOKEN

export async function generateTokens(email, username, userId) {
    if (!JWT_ACCESS_TOKEN || !JWT_REFRESH_TOKEN) {
        throw new Error("JWT_ACCESS_TOKEN or JWT_REFRESH_TOKEN is not defined")
    }
    const refreshScrect = new TextEncoder().encode(JWT_REFRESH_TOKEN)
    const accessScrect = new TextEncoder().encode(JWT_ACCESS_TOKEN)

    try {
        const accessToken = await new SignJWT({ userId, username, email }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("15m").sign(accessScrect);
        const refreshToken = await new SignJWT({ userId, username, email }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(refreshScrect);
        return { accessToken, refreshToken }
    } catch (error) {
        throw new Error("Failed to generate tokens")
    }
}