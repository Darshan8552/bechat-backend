import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
const { PrismaClientKnownRequestError } = Prisma;

export const errorHandler = (error, req, res, next) => {
    console.error("Error:", error)

    if (error instanceof ZodError) {
        return res.status(400).json({
            error: "Validation failed",
            details: error.errors.map((err) => ({
                field: err.path.join("."),
                message: err.message,
            })),
        })
    }

    if (error instanceof PrismaClientKnownRequestError) {
        switch (error.code) {
            case "P2002":
                return res.status(409).json({
                    error: "Unique constraint violation",
                    field: error.meta?.target,
                })
            case "P2025":
                return res.status(404).json({
                    error: "Record not found",
                })
            default:
                return res.status(500).json({
                    error: "Database error occurred",
                })
        }
    }

    if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
            error: "Invalid token",
        })
    }

    if (error.name === "TokenExpiredError") {
        return res.status(401).json({
            error: "Token expired",
            code: "TOKEN_EXPIRED",
        })
    }

    const statusCode = error.statusCode || error.status || 500
    const message = error.message || "Internal server error"

    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    })
}

export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next)
    }
}