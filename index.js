import express from "express";
import cors from "cors";
import { configDotenv } from "dotenv";
import cookieParser from "cookie-parser";
import { errorHandler } from "./src/middlewares/error.middleware.js";
import { requestLogger } from "./src/middlewares/logger.middleware.js";
import authRoutes from "./src/routes/auth.route.js";
configDotenv();

const app = express();
const PORT = process.env.PORT;
if (!PORT) {
  throw new Error("PORT is required in .env!");
}

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL
        : "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(requestLogger);

app.get("/", (req, res) => {
  res.json({ status: "Server is running" });
});

app.use("/api/auth", authRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log("Server running successfully");
});
