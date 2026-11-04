const { clinicColumns } = require('./routes/accounts');
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const fail = (message,status=400) => Object.assign(new Error(message),{status});
async function clinicAccess(db,req,writing=false) {
  if (req.user.ownerAccess ? !uuid.test(req.query.clinicId || '') : req.query.clinicId !== undefined)
    throw fail(req.user.ownerAccess ? 'Select a clinic to manage.' : 'Clinic staff can only access their own clinic.',req.user.ownerAccess ? 400 : 403);
  const result = await db.query(`SELECT ${clinicColumns},
    CASE WHEN c.owner_user_id=$2 OR $3 THEN 'owner' ELSE m.access_role END AS "staffRole"
    FROM clinics c LEFT JOIN clinic_memberships m ON m.clinic_id=c.id AND m.user_id=$2 AND m.revoked_at IS NULL
    WHERE ${req.user.ownerAccess ? 'c.id=$1' : '(c.owner_user_id=$2 OR m.user_id=$2)'}
    ORDER BY c.created_at,c.id LIMIT 1${writing ? ' FOR UPDATE OF c' : ''}`,
    [req.user.ownerAccess ? req.query.clinicId : req.user.id,req.user.id,!!req.user.ownerAccess]);
  const clinic=result.rows[0];
  if (!clinic || clinic.status!=='approved') throw fail('Clinic approval and active staff access are required to use clinic tools.',403);
  // Recheck after taking the clinic lock: revocation and all writes serialize here.
  if (writing && clinic.staffRole!=='owner') {
    const membership=(await db.query('SELECT access_role FROM clinic_memberships WHERE user_id=$1 AND clinic_id=$2 AND revoked_at IS NULL',[req.user.id,clinic.id])).rows[0];
    if (!membership) throw fail('Your clinic access has been removed.',403);
    clinic.staffRole=membership.access_role;
  }
  return clinic;
}
function permit(clinic,path) {
  if (path.startsWith('/staff') && clinic.staffRole!=='owner') throw fail('Only the clinic owner can manage staff access.',403);
  if (clinic.staffRole==='appointments' && path!=='/' && !/^\/(appointments|schedules)(\/|$)/.test(path))
    throw fail('Your staff access covers appointments, patient follow-up, and working hours.',403);
}
module.exports={clinicAccess,permit,fail,uuid};
