import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/error.js";
import authRoutes from "./routes/auth.routes.js";
import bookRoutes from "./routes/book.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import authorRoutes from "./routes/author.routes.js";
import userRoutes from "./routes/user.routes.js";
import borrowRoutes from "./routes/borrow.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import settingsRoutes from "./routes/settings.routes.js";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin === env.CLIENT_URL || origin.startsWith("http://localhost")) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ success: true, message: "Library API is healthy" });
});

app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/authors", authorRoutes);
app.use("/api/users", userRoutes);
app.use("/api/borrows", borrowRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/settings", settingsRoutes);

app.use(notFound);
app.use(errorHandler);
