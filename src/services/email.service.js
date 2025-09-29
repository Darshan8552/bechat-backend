import {
  TransactionalEmailsApi,
  TransactionalEmailsApiApiKeys,
} from "@getbrevo/brevo";

export const sendEmail = async (email, type, otp) => {
  try {
    const { BREVO_API_KEY, BREVO_FROM, BREVO_SENDER_NAME, NODE_ENV } =
      process.env;
    if (!BREVO_API_KEY || !BREVO_FROM || !NODE_ENV) {
      throw new Error("ENV variables for Brevo are not set!");
    }

    const apiInstance = new TransactionalEmailsApi();
    apiInstance.setApiKey(TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);

    const sendSmtpEmail = {
      sender: {
        email: BREVO_FROM,
        name: BREVO_SENDER_NAME,
      },
      to: [{ email: email }],
      subject: emailTemplates(type).subject,
      htmlContent: emailTemplates(type, otp).html,
      textContent: emailTemplates(type, otp).html.replace(/<[^>]*>/g, ""),
    };
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    return result.body;
  } catch (error) {
    console.error("Failed to send Email:", error.message);
    throw new Error("Failed to send Email: " + error.message);
  }
};

const emailTemplates = (type, otp) => {
  const baseStyle = `
    font-family: Arial, sans-serif;
    color: #333;
    line-height: 1.5;
    max-width: 500px;
    margin: auto;
    padding: 20px;
    border: 1px solid #eee;
    border-radius: 8px;
    background-color: #fafafa;
  `;

  const header = `
    <h2 style="text-align:center; color:#4a90e2; margin-bottom:20px;">
      BeChat
    </h2>
  `;

  const footer = `
    <p style="font-size:12px; text-align:center; color:#777; margin-top:30px;">
      If you did not request this, you can ignore this email.<br/>
      © ${new Date().getFullYear()} BeChat, All rights reserved.
    </p>
  `;

  switch (type) {
    case "EMAIL_VERIFICATION":
      return {
        subject: "Verify your email address - BeChat",
        html: `
          <div style="${baseStyle}">
            ${header}
            <p>Hello,</p>
            <p>Thank you for signing up with <strong>BeChat</strong>.</p>
            <p>Please use the verification code below to verify your email address:</p>
            <h3 style="text-align:center; background:#f0f0f0; padding:10px; border-radius:6px; font-size:20px;">
              ${otp}
            </h3>
            <p>If you did not create an account, please ignore this email.</p>
            ${footer}
          </div>
        `,
      };

    case "RESET_PASSWORD":
      return {
        subject: "Reset your password - BeChat",
        html: `
          <div style="${baseStyle}">
            ${header}
            <p>Hello,</p>
            <p>We received a request to reset your password for <strong>BeChat</strong>.</p>
            <p>Please use the following code to reset your password:</p>
            <h3 style="text-align:center; background:#f0f0f0; padding:10px; border-radius:6px; font-size:20px;">
              ${otp}
            </h3>
            <p>If you did not request this change, you can safely ignore this email.</p>
            ${footer}
          </div>
        `,
      };

    default:
      return {
        subject: "Welcome to BeChat 🎉",
        html: `
          <div style="${baseStyle}">
            ${header}
            <p>Hello,</p>
            <p>Welcome to <strong>BeChat</strong>! We're glad to have you on board.</p>
            <p>You can now connect and chat with others in real time.</p>
            <p>Let’s get started 🚀</p>
            ${footer}
          </div>
        `,
      };
  }
};
