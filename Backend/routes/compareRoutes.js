import express from "express";
import { comparePrices, getSearchHistory } from "../controllers/compareController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, comparePrices);
router.get("/history", protect, getSearchHistory);

export default router;
