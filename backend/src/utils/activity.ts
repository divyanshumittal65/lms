import { pool } from "../database/pool.js";

export async function logActivity(input: {
  userId?: number | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  details?: Record<string, unknown>;
}) {
  await pool.execute(
    `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
     VALUES (:userId, :action, :entityType, :entityId, :details)`,
    {
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      details: input.details ? JSON.stringify(input.details) : null
    }
  );
}
