const express = require("express");

const clinicFields = `
  c.id, c.name, c.description, c.address, c.phone, c.email,
  c.deposit_percentage AS "depositPercentage",
  COALESCE((SELECT json_agg(json_build_object(
    'id', s.id, 'name', s.name, 'category', s.category,
    'description', s.description, 'price', s.estimated_price,
    'duration', s.duration_minutes
  ) ORDER BY s.name) FROM services s
    WHERE s.clinic_id = c.id AND s.is_active = TRUE), '[]'::json) AS services,
  COALESCE((SELECT json_agg(json_build_object(
    'id', d.id, 'name', d.full_name, 'title', d.title,
    'credentials', d.credentials_summary
  ) ORDER BY d.full_name) FROM dentists d
    WHERE d.clinic_id = c.id AND d.is_active = TRUE), '[]'::json) AS dentists`;

function createClinicRouter(pool) {
  const router = express.Router();
  router.get("/", async (req, res, next) => {
    try {
      const result = await pool.query(`SELECT ${clinicFields}
        FROM clinics c WHERE c.status = 'approved'
        ORDER BY c.name, c.id`);
      res.json({ clinics: result.rows });
    } catch (error) {
      next(error);
    }
  });
  router.get("/:id", async (req, res, next) => {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        req.params.id,
      )
    ) {
      return res.status(404).json({ error: "Clinic not found." });
    }
    try {
      const result = await pool.query(
        `SELECT ${clinicFields}
        FROM clinics c WHERE c.status = 'approved' AND c.id = $1`,
        [req.params.id],
      );
      if (!result.rows.length)
        return res.status(404).json({ error: "Clinic not found." });
      res.json({ clinic: result.rows[0] });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
module.exports = { createClinicRouter };
