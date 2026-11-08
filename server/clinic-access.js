const { clinicColumns } = require('./routes/accounts');
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const fail = (message,status=400) => Object.assign(new Error(message),{status});
async function clinicAccess(db,req,writing=false) {
  if (req.user.ownerAccess ? !uuid.test(req.query.clinicId || '') : req.query.clinicId !== undefined)
    throw fail(req.user.ownerAccess ? 'Select a clinic to manage.' : 'Clinic staff can only access their own clinic.',req.user.ownerAccess ? 400 : 403);
  const result = await db.query(`SELECT ${clinicColumns},
    CASE WHEN c.owner_user_id=$2 OR $3 THEN 'owner' ELSE m.access_role END AS "staffRole"
    FROM clinics c LEFT JOIN clinic_memberships m ON m.clinic_id=c.id AND m.user_id=$2 AND m.revoked_at IS NULL
    WHERE ($3 AND c.id=$1::uuid) OR (NOT $3 AND (c.owner_user_id=$2 OR m.user_id=$2))
    ORDER BY c.created_at,c.id LIMIT 1${writing ? ' FOR UPDATE OF c' : ''}`,
    [req.user.ownerAccess ? req.query.clinicId : req.user.id,req.user.id,!!req.user.ownerAccess]);
  const clinic=result.rows[0];
  if (!clinic || clinic.status!=='approved') throw fail('Clinic approval and active staff access are required to use clinic tools.',403);
  // Recheck after taking the clinic lock: revocation and all writes serialize here.
  const ownsClinic=writing && (req.user.ownerAccess || (await db.query('SELECT owner_user_id FROM clinics WHERE id=$1',[clinic.id])).rows[0]?.owner_user_id===req.user.id);
  if (writing && !ownsClinic) {
    const membership=(await db.query('SELECT access_role FROM clinic_memberships WHERE user_id=$1 AND clinic_id=$2 AND revoked_at IS NULL',[req.user.id,clinic.id])).rows[0];
    if (!membership) throw fail('Your clinic access has been removed.',403);
    clinic.staffRole=membership.access_role;
  }
  if (ownsClinic) clinic.staffRole='owner';
  if (clinic.staffRole==='dentist') {
    const member=(await db.query('SELECT m.dentist_id FROM clinic_memberships m JOIN dentists d ON d.id=m.dentist_id AND d.clinic_id=m.clinic_id WHERE m.user_id=$1 AND m.clinic_id=$2 AND m.revoked_at IS NULL AND d.is_active=TRUE',[req.user.id,clinic.id])).rows[0];
    if (!member) throw fail('Active linked dentist access is required.',403);
    clinic.dentistId=member.dentist_id;
  }
  return clinic;
}
function permit(clinic,path) {
  if (clinic.staffRole==='dentist' && path!=='/' && !/^\/appointments(\/|$)/.test(path)) throw fail('Dentist access covers only your assigned appointments and follow-up.',403);
  if (clinic.staffRole==='dentist' && (/\/changes(?:\/|$)/.test(path) || /\/cancel$/.test(path))) throw fail('Appointment changes require clinic staff.',403);
  if (path.startsWith('/staff') && clinic.staffRole!=='owner') throw fail('Only the clinic owner can manage staff access.',403);
  if (clinic.staffRole==='appointments' && path!=='/' && !/^\/(appointments|schedules)(\/|$)/.test(path))
    throw fail('Your staff access covers appointments, patient follow-up, and working hours.',403);
}
module.exports={clinicAccess,permit,fail,uuid};
