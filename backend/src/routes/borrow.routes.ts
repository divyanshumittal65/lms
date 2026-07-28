import { Router } from "express";
import { borrowBook, listBorrows, returnBook } from "../controllers/borrow.controller.js";

const router = Router();

router.get("/", listBorrows);
router.post("/", borrowBook);
router.patch("/:id/return", returnBook);

export default router;
