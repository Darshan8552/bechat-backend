import express from "express"
import { checkUsername, resendVerificationOtp, signUp, verifyOtp } from "../controllers/auth.controller.js"
import { asyncHandler } from "../middlewares/error.middleware.js"
const router = express.Router()

router.get("/check-username", asyncHandler(checkUsername))
router.post("/signup", asyncHandler(signUp))
router.post("/verify-email", asyncHandler(verifyOtp))
router.post("/resend-email", asyncHandler(resendVerificationOtp))

export default router