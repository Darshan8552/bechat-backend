import {} from "@getbrevo/brevo"

export const sendEmail = async (email, type, otp) => {
    try {
        const { BREVO_API_KEY, BREVO_FROM, BREVO_SENDER_NAME, NODE_ENV } = process.env;
        if (!BREVO_API_KEY || !BREVO_FROM || !NODE_ENV) {
            throw new Error("ENV variables for Brevo are not set!");
        }
    } catch (error) {
        
    }
}