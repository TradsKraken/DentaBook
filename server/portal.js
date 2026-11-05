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
  const accountTools=patient && req.method==='PUT' && ['/auth/patient/profile','/auth/patient/password'].includes(path);
  const invitations=clinic && req.method==='POST' && ['/auth/staff-invitation/details','/auth/staff-invitation/accept'].includes(path);
  const intake=patient && ((read && /^\/workspaces\/patient\/appointments\/[^/]+\/intake$/.test(path)) ||
    (req.method==='PUT' && /^\/workspaces\/patient\/appointments\/[^/]+\/intake$/.test(path)) ||
    (req.method==='POST' && /^\/workspaces\/patient\/appointments\/[^/]+\/followups\/[^/]+\/reply$/.test(path)));
  const clinicTools=clinic && (
    (['GET','HEAD','PUT'].includes(req.method) && path==='/workspaces/clinic/manage/intake-settings') ||
    (read && /^\/workspaces\/clinic\/manage\/appointments\/[^/]+\/intake$/.test(path)) ||
    (req.method==='POST' && /^\/workspaces\/clinic\/manage\/appointments\/[^/]+\/followups$/.test(path)) ||
    (read && path==='/workspaces/clinic/manage/staff') ||
    (req.method==='POST' && path==='/workspaces/clinic/manage/staff/invitations') ||
    (req.method==='DELETE' && /^\/workspaces\/clinic\/manage\/staff\/(invitations|members)\/[^/]+$/.test(path)) ||
    (req.method==='PUT' && /^\/workspaces\/clinic\/manage\/staff\/members\/[^/]+$/.test(path)) ||
    (req.method==='POST' && path==='/workspaces/clinic/manage/schedules/bulk') ||
    (req.method==='PUT' && /^\/workspaces\/clinic\/manage\/schedules\/[^/]+$/.test(path)));
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
  const patientChanges = patient && ((read && /^\/workspaces\/patient\/appointments\/[^/]+\/(changes|reschedule-availability)$/.test(path)) ||
    (req.method === "POST" && (/^\/workspaces\/patient\/appointments\/[^/]+\/(cancel|reschedule)$/.test(path) || /^\/workspaces\/patient\/appointments\/[^/]+\/changes\/[^/]+\/withdraw$/.test(path))));
  const clinicChanges = clinic && ((read && /^\/workspaces\/clinic\/manage\/appointments\/[^/]+\/changes$/.test(path)) ||
    (req.method === "PUT" && path === "/workspaces/clinic/manage/appointment-policy") ||
    (req.method === "POST" && (/^\/workspaces\/clinic\/manage\/appointments\/[^/]+\/cancel$/.test(path) || /^\/workspaces\/clinic\/manage\/appointments\/[^/]+\/changes\/[^/]+\/review$/.test(path))));
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
  if (common || login || registration || workspace || patientPayment || clinicPayment || patientChanges || clinicChanges || accountTools || invitations || intake || clinicTools) return next();
  return res.status(404).set("Cache-Control", "no-store").json({ error: "API route not found in this portal." });
}
module.exports = { configuredPortal, portalAllowsRole, restrictPortal };
