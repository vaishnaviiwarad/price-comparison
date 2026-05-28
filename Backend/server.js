import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import compareRoutes from "./routes/compareRoutes.js";

dotenv.config();
connectDB();

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Price Comparison API is running." });
});

app.use("/api/auth", authRoutes);
app.use("/api/compare", compareRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
