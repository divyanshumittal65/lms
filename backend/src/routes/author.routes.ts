import { Router } from "express";
import { createAuthor, deleteAuthor, listAuthors, updateAuthor } from "../controllers/author.controller.js";

const router = Router();

router.get("/", listAuthors);
router.post("/", createAuthor);
router.put("/:id", updateAuthor);
router.delete("/:id", deleteAuthor);

export default router;
