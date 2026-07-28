import { Router } from "express";
import { listUsers, updateUserStatus } from "../controllers/user.controller.js";

const router = Router();

router.get("/", listUsers);
router.patch("/:id/status", updateUserStatus);

export default router;
