import { pool } from "../database/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";
import { logActivity } from "../utils/activity.js";
import { ok } from "../utils/http.js";
import { settingsSchema } from "../validators/catalog.schema.js";

export const getSettings = [
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    const [rows] = await pool.execute(`SELECT setting_key, setting_value FROM settings`);
    ok(res, "Settings fetched", rows);
  })
];

export const updateSettings = [
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const payload = settingsSchema.parse(req.body);
    await pool.execute(
      `INSERT INTO settings (setting_key, setting_value)
       VALUES ('borrow_duration_days', :value)
       ON DUPLICATE KEY UPDATE setting_value = :value`,
      { value: String(payload.borrowDurationDays) }
    );
    await logActivity({ userId: req.user?.id, action: "settings_updated", entityType: "settings", details: payload });
    ok(res, "Settings updated");
  })
];
