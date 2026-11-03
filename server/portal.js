const roles = { patient: "patient", clinic: "clinic_staff", admin: "system_admin" };

function configuredPortal() {
  const portal = process.env.APP_PORTAL || "all";
  if (!["all", "public"].includes(portal) && !Object.hasOwn(roles, portal)) throw new Error("APP_PORTAL must be public, patient, clinic, admin, or all.");
  return portal;
}
function portalAllowsRole(role) {
  const portal = configuredPortal();
  if (portal === "all") return true;
  if (portal === "public") return role === "patient" || role === "clinic_staff";
  return role === roles[portal];
}
function restrictPortal(req, res, next) {
  const portal = configuredPortal();
  if (portal === "all") return next();
  // req.path is relative to /api. Never trust a caller-supplied portal header.
  const path = req.path.replace(/\/+$/, "") || "/";
  const read = ["GET", "HEAD"].includes(req.method);
  const common = (read && (path === "/" || path === "/health" || /^\/clinics(?:\/[^/]+)?$/.test(path) || path === "/auth/me")) ||
    (req.method === "POST" && path === "/auth/logout");
  const patient = portal === "patient" || portal === "public";
  const clinic = portal === "clinic" || portal === "public";
  const login = req.method === "POST" && (
    (patient && path === "/auth/patient/login") ||
    (clinic && path === "/auth/clinic/login") ||
    (portal === "admin" && path === "/auth/admin/login")
  );
  const registration = req.method === "POST" && (
    (patient && path === "/auth/register-patient") ||
    (clinic && ["/auth/register-clinic", "/auth/login"].includes(path))
  );
  const patientPayment = patient && ((read && /^\/workspaces\/patient\/appointments\/[^/]+\/payment$/.test(path)) ||
    (req.method === "POST" && /^\/workspaces\/patient\/appointments\/[^/]+\/(payment-choice|payment-reference)$/.test(path)) ||
    (read && /^\/workspaces\/patient\/payments\/[^/]+\/receipt$/.test(path)));
  const clinicPayment = clinic && ((read && (path === "/workspaces/clinic/manage/payments" || /^\/workspaces\/clinic\/manage\/payments\/[^/]+\/receipt$/.test(path))) ||
    (req.method === "POST" && /^\/workspaces\/clinic\/manage\/payments\/[^/]+\/review$/.test(path)));
  const workspace = (patient && ((read && ["/workspaces/patient/appointments", "/workspaces/patient/booking-options", "/workspaces/patient/availability"].includes(path)) ||
      (req.method === "POST" && path === "/workspaces/patient/appointments"))) ||
    (clinic && ((read && ["/workspaces/clinic", "/workspaces/clinic/options"].includes(path)) ||
      (read && ["/workspaces/clinic/manage", "/workspaces/clinic/manage/appointments"].includes(path)) ||
      (req.method === "PUT" && ["/workspaces/clinic/manage/profile","/workspaces/clinic/manage/deposit-policy"].includes(path)) ||
      (req.method === "POST" && /^\/workspaces\/clinic\/manage\/(services|dentists|schedules)$/.test(path)) ||
      (req.method === "PUT" && /^\/workspaces\/clinic\/manage\/(services|dentists)\/[^/]+$/.test(path)) ||
      (req.method === "PUT" && /^\/workspaces\/clinic\/manage\/appointments\/[^/]+\/review$/.test(path)) ||
      (req.method === "DELETE" && /^\/workspaces\/clinic\/manage\/schedules\/[^/]+$/.test(path)))) ||
    (portal === "admin" && ((read && path === "/workspaces/admin/clinics") ||
      (req.method === "POST" && /^\/workspaces\/admin\/clinics\/[^/]+\/review$/.test(path))));
  if (common || login || registration || workspace || patientPayment || clinicPayment) return next();
  return res.status(404).set("Cache-Control", "no-store").json({ error: "API route not found in this portal." });
}
module.exports = { configuredPortal, portalAllowsRole, restrictPortal };
