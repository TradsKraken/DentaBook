const crypto=require('node:crypto');
const bcrypt=require('bcrypt');
const {email,text}=require('./validation');
const {hashToken,rateLimit}=require('./auth');
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const validRole=role=>['manager','appointments'].includes(role);
const validToken=value=>typeof value==='string' && /^[a-f0-9]{64}$/.test(value);
function registerStaffEndpoints(endpoint) {
  endpoint('get','/staff',async(db,clinic)=>({
    members:(await db.query(`SELECT m.user_id AS id,u.full_name AS name,u.email,m.access_role AS role,m.joined_at AS "joinedAt",m.revoked_at AS "revokedAt"
      FROM clinic_memberships m JOIN users u ON u.id=m.user_id WHERE m.clinic_id=$1 ORDER BY m.joined_at,m.user_id`,[clinic.id])).rows,
    invitations:(await db.query(`SELECT id,email,access_role AS role,expires_at AS "expiresAt",accepted_at AS "acceptedAt",revoked_at AS "revokedAt"
      FROM clinic_staff_invitations WHERE clinic_id=$1 ORDER BY created_at DESC,id`,[clinic.id])).rows
  }));
  endpoint('post','/staff/invitations',async(db,clinic,req)=>{
    const b=req.body || {};
    if (!email(b.email) || !validRole(b.role)) throw fail('Enter the staff email and choose manager or appointment staff.');
    const address=b.email.trim().toLowerCase();
    const existing=(await db.query(`SELECT u.id,u.role,u.owner_access,
      EXISTS(SELECT 1 FROM clinics WHERE owner_user_id=u.id) AS owner,
      EXISTS(SELECT 1 FROM clinic_memberships WHERE user_id=u.id AND revoked_at IS NULL) AS member
      FROM users u WHERE LOWER(u.email)=$1`,[address])).rows[0];
    if (existing && (existing.role!=='clinic_staff' || existing.owner_access || existing.owner || existing.member))
      throw fail('This address already belongs to an account that cannot join this clinic. Use a separate staff email.',409);
    await db.query('UPDATE clinic_staff_invitations SET revoked_at=CURRENT_TIMESTAMP WHERE clinic_id=$1 AND email=$2 AND accepted_at IS NULL AND revoked_at IS NULL',[clinic.id,address]);
    const token=crypto.randomBytes(32).toString('hex');
    const invitation=(await db.query(`INSERT INTO clinic_staff_invitations (clinic_id,email,access_role,token_hash,invited_by,expires_at)
      VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP + INTERVAL '48 hours') RETURNING id,expires_at AS "expiresAt"`,[clinic.id,address,b.role,hashToken(token),req.user.id])).rows[0];
    return {invitation,token};
  });
  endpoint('delete','/staff/invitations/:id',async(db,clinic,req)=>{
    const result=await db.query('UPDATE clinic_staff_invitations SET revoked_at=CURRENT_TIMESTAMP WHERE id=$1 AND clinic_id=$2 AND accepted_at IS NULL AND revoked_at IS NULL RETURNING id',[req.params.id,clinic.id]);
    if (!result.rows.length) throw fail('This invitation is no longer active.',409);
    return {revoked:true};
  });
  endpoint('put','/staff/members/:id',async(db,clinic,req)=>{
    if (!validRole(req.body?.role)) throw fail('Choose manager or appointment staff.');
    const result=await db.query('UPDATE clinic_memberships SET access_role=$1 WHERE user_id=$2 AND clinic_id=$3 AND revoked_at IS NULL RETURNING user_id',[req.body.role,req.params.id,clinic.id]);
    if (!result.rows.length) throw fail('Active staff member not found.',404);
    return {saved:true};
  });
  endpoint('delete','/staff/members/:id',async(db,clinic,req)=>{
    const result=await db.query('UPDATE clinic_memberships SET revoked_at=CURRENT_TIMESTAMP WHERE user_id=$1 AND clinic_id=$2 AND revoked_at IS NULL RETURNING user_id',[req.params.id,clinic.id]);
    if (!result.rows.length) throw fail('Active staff member not found.',404);
    // Clear sessions too; membership checks independently protect every action.
    await db.query("DELETE FROM sessions WHERE user_id=$1 AND role='clinic_staff'",[req.params.id]);
    return {revoked:true};
  });
}
function registerInvitationRoutes(router,pool) {
  const limiter=rateLimit({limit:20,windowMs:15*60*1000});
  router.post('/staff-invitation/details',limiter,async(req,res,next)=>{
    try {
      if (!validToken(req.body?.token)) throw fail('This invitation is invalid or expired.',404);
      const invitation=(await pool.query(`SELECT i.email,i.access_role AS role,c.name AS "clinicName",i.expires_at AS "expiresAt"
        FROM clinic_staff_invitations i JOIN clinics c ON c.id=i.clinic_id
        WHERE i.token_hash=$1 AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at>CURRENT_TIMESTAMP AND c.status='approved'`,[hashToken(req.body.token)])).rows[0];
      if (!invitation) throw fail('This invitation is invalid, expired, or no longer available.',404);
      res.json({invitation});
    } catch(error) { if (error.status) res.status(error.status).json({error:error.message}); else next(error); }
  });
  router.post('/staff-invitation/accept',limiter,async(req,res,next)=>{
    let db;
    try {
      const b=req.body || {};
      if (!validToken(b.token) || !email(b.email) || typeof b.password!=='string' || b.password.length<12 || Buffer.byteLength(b.password)>72)
        throw fail('Enter the invited email and a password of at least 12 characters, up to 72 UTF-8 bytes.');
      db=await pool.connect(); await db.query('BEGIN');
      // Lock clinic before invitation, matching owner mutations and revocation.
      const clinic=(await db.query(`SELECT c.id FROM clinics c JOIN clinic_staff_invitations i ON i.clinic_id=c.id WHERE i.token_hash=$1 AND c.status='approved' FOR UPDATE OF c`,[hashToken(b.token)])).rows[0];
      if (!clinic) throw fail('This invitation is no longer available.',409);
      const invitation=(await db.query(`SELECT * FROM clinic_staff_invitations WHERE token_hash=$1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>CURRENT_TIMESTAMP FOR UPDATE`,[hashToken(b.token)])).rows[0];
      if (!invitation || invitation.email!==b.email.trim().toLowerCase()) throw fail('This invitation is invalid, expired, or belongs to a different email.',409);
      let user=(await db.query('SELECT * FROM users WHERE LOWER(email)=$1 FOR UPDATE',[invitation.email])).rows[0];
      if (user) {
        if (user.role!=='clinic_staff' || user.owner_access || !await bcrypt.compare(b.password,user.password_hash)) throw fail('Use the existing clinic-staff password for the invited email. Other portal accounts cannot join.',403);
        const blocked=(await db.query(`SELECT id FROM clinics WHERE owner_user_id=$1 UNION ALL SELECT clinic_id FROM clinic_memberships WHERE user_id=$1 AND revoked_at IS NULL`,[user.id])).rows.length;
        if (blocked) throw fail('This account already has clinic access.',409);
      } else {
        if (!text(b.name,150)) throw fail('Enter your full name.');
        user=(await db.query(`INSERT INTO users (full_name,email,password_hash,role) VALUES ($1,$2,$3,'clinic_staff') RETURNING id`,[b.name.trim(),invitation.email,await bcrypt.hash(b.password,12)])).rows[0];
      }
      await db.query(`INSERT INTO clinic_memberships (user_id,clinic_id,access_role,invited_by) VALUES ($1,$2,$3,$4)
        ON CONFLICT (user_id) DO UPDATE SET clinic_id=EXCLUDED.clinic_id,access_role=EXCLUDED.access_role,invited_by=EXCLUDED.invited_by,joined_at=CURRENT_TIMESTAMP,revoked_at=NULL`,[user.id,clinic.id,invitation.access_role,invitation.invited_by]);
      await db.query('UPDATE clinic_staff_invitations SET accepted_at=CURRENT_TIMESTAMP WHERE id=$1',[invitation.id]);
      await db.query("DELETE FROM sessions WHERE user_id=$1 AND role='clinic_staff'",[user.id]);
      await db.query('COMMIT'); res.json({accepted:true});
    } catch(error) {
      if (db) await db.query('ROLLBACK');
      if (error.status) res.status(error.status).json({error:error.message});
      else if (error.code==='23505') res.status(409).json({error:'This account changed while accepting. Please try again.'});
      else next(error);
    } finally { db?.release(); }
  });
}
module.exports={registerStaffEndpoints,registerInvitationRoutes};
