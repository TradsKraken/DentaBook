const express = require("express");
const { requireSession, requireRole } = require("../auth");
const { ownedClinic, clinicColumns } = require("./accounts");
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

function createWorkspaceRouter(pool) {
  const router = express.Router();
  router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  router.use(requireSession(pool));
  router.get(
    "/patient/appointments",
    requireRole("patient"),
    async (req, res, next) => {
      try {
        const result = await pool.query(
          `SELECT a.id, a.appointment_code AS "appointmentCode", a.status,
        a.appointment_date::text AS date, to_char(a.start_time,'HH24:MI') AS time,
        a.estimated_total_cost AS total, c.name AS "clinicName", c.address AS "clinicAddress",
        d.full_name AS "dentistName",
        COALESCE((SELECT json_agg(s.name ORDER BY s.name) FROM appointment_services aps
          JOIN services s ON s.id=aps.service_id WHERE aps.appointment_id=a.id),'[]'::json) AS services
        FROM appointments a JOIN clinics c ON c.id=a.clinic_id LEFT JOIN dentists d ON d.id=a.dentist_id
        WHERE a.patient_user_id=$1 ORDER BY a.appointment_date DESC,a.start_time DESC,a.id LIMIT 50`,
          [req.user.id],
        );
        res.json({ appointments: result.rows });
      } catch (error) {
        next(error);
      }
    },
  );
  router.get("/clinic/options", requireRole("clinic_staff"), async (req, res, next) => {
    if (!req.user.ownerAccess)
      return res.status(403).json({ error: "Owner access is required to select another clinic." });
    try {
      const result = await pool.query("SELECT id, name, status FROM clinics ORDER BY name, id");
      res.json({ clinics: result.rows });
    } catch (error) { next(error); }
  });
  router.get("/clinic", requireRole("clinic_staff"), async (req, res, next) => {
    try {
      let clinic;
      if (req.user.ownerAccess) {
        if (!uuid.test(req.query.clinicId || ""))
          return res.status(400).json({ error: "Select a clinic to open its workspace." });
        clinic = (await pool.query(`SELECT ${clinicColumns} FROM clinics c WHERE c.id = $1`, [req.query.clinicId])).rows[0];
        if (!clinic) return res.status(404).json({ error: "This clinic is no longer available." });
      } else {
        if (req.query.clinicId !== undefined)
          return res.status(403).json({ error: "Clinic staff can only access their own clinic." });
        clinic = await ownedClinic(pool, req.user.id);
      }
      if (!clinic || (!req.user.ownerAccess && clinic.status !== "approved"))
        return res.status(403).json({
          error: "Clinic approval is required to access the dashboard.",
        });
      const result = await pool.query(
        `SELECT
        (SELECT COUNT(*)::int FROM dentists WHERE clinic_id = $1 AND is_active = TRUE) AS dentists,
        (SELECT COUNT(*)::int FROM services WHERE clinic_id = $1 AND is_active = TRUE) AS services,
        (SELECT COUNT(*)::int FROM appointments WHERE clinic_id = $1 AND status = 'pending_review') AS "pendingAppointments"`,
        [clinic.id],
      );
      res.json({ clinic, counts: result.rows[0] });
    } catch (error) {
      next(error);
    }
  });
  router.get(
    "/admin/clinics",
    requireRole("system_admin"),
    async (req, res, next) => {
      const status = req.query.status || "pending_review";
      if (
        !["pending_review", "approved", "rejected", "suspended"].includes(
          status,
        )
      )
        return res
          .status(400)
          .json({ error: "Choose a valid registration status." });
      try {
        const result = await pool.query(
          `SELECT ${clinicColumns},
        u.full_name AS "ownerName", u.email AS "ownerEmail"
        FROM clinics c LEFT JOIN users u ON u.id = c.owner_user_id
        WHERE c.status = $1 ORDER BY c.created_at, c.id`,
          [status],
        );
        res.json({ clinics: result.rows });
      } catch (error) {
        next(error);
      }
    },
  );
  router.post(
    "/admin/clinics/:id/review",
    requireRole("system_admin"),
    async (req, res, next) => {
      const { decision, notes } = req.body || {};
      if (
        !uuid.test(req.params.id) ||
        !["approved", "rejected"].includes(decision) ||
        (notes !== undefined &&
          (typeof notes !== "string" || notes.length > 2000)) ||
        (decision === "rejected" && !notes?.trim())
      ) {
        return res.status(400).json({
          error:
            "Choose approve or reject. A rejection requires a reason (up to 2,000 characters).",
        });
      }
      try {
        const result = await pool.query(
          `UPDATE clinics SET status = $1, review_notes = $2,
        reviewed_by = $3, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4 AND status = 'pending_review' RETURNING id, status`,
          [decision, notes?.trim() || null, req.user.id, req.params.id],
        );
        if (!result.rows.length)
          return res.status(409).json({
            error:
              "This registration is no longer awaiting review. Refresh the list.",
          });
        res.json({ clinic: result.rows[0] });
      } catch (error) {
        next(error);
      }
    },
  );
  return router;
}
module.exports = { createWorkspaceRouter };
