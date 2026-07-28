import { Router } from "express";
import { createBook, deleteBook, getBook, listBooks, updateBook, updateCopyStatus } from "../controllers/book.controller.js";

const router = Router();

router.get("/", listBooks);
router.get("/:id", getBook);
router.post("/", createBook);
router.put("/:id", updateBook);
router.delete("/:id", deleteBook);
router.patch("/copies/:copyId/status", updateCopyStatus);

export default router;
