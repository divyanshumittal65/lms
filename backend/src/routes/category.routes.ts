import { Router } from "express";
import { createCategory, deleteCategory, listCategories, updateCategory } from "../controllers/category.controller.js";

const router = Router();

router.get("/", listCategories);
router.post("/", createCategory);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

export default router;
