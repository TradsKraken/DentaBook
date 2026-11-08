const {fail}=require('./clinic-access');
async function bookingIntake(db,clinicId,serviceId=null) {
  const settings=(await db.query('SELECT enabled,purpose,retention,questions,version FROM clinic_intake_settings WHERE clinic_id=$1',[clinicId])).rows[0];
  if (!settings?.enabled) return null;
  return {...settings,questions:settings.questions.filter(q=>!serviceId || !q.serviceId || q.serviceId===serviceId)};
}
async function saveBookingIntake(db,clinicId,serviceId,id,patientId,key,input) {
  const settings=await bookingIntake(db,clinicId,serviceId);
  if (!settings?.questions.length) {
    if (input) throw fail('The clinic intake questions changed. Refresh booking options.',409);
    return;
  }
  if (!input || input.version!==settings.version) throw fail('Review the current clinic questions before submitting. Refresh booking options if they changed.',409);
  if (input.consent!==true || !Array.isArray(input.answers) || input.answers.length>30) throw fail('Answer the clinic questions and agree to share your answers.');
  const seen=new Set(),answers=[];
  for(const a of input.answers) {
    const q=settings.questions.find(q=>q.id===a?.questionId);
    if (!q || seen.has(q.id) || typeof a.value!=='string' || a.value.length>2000) throw fail('Check your intake answers; each may contain up to 2,000 characters.');
    const value=a.value.trim();seen.add(q.id);
    if (q.type==='yes_no' && value && !['yes','no','unsure'].includes(value)) throw fail('Choose yes, no, or unsure.');
    if (q.required && !value) throw fail(`Please answer: ${q.label}`);
    answers.push({...q,questionId:q.id,value});
  }
  if(settings.questions.some(q=>q.required && !seen.has(q.id))) throw fail('Please answer all required clinic questions.');
  await db.query(`INSERT INTO appointment_intake_submissions (appointment_id,submitted_by,request_key,template_version,purpose,retention,answers) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,[id,patientId,key,settings.version,settings.purpose,settings.retention,JSON.stringify(answers)]);
}
module.exports={bookingIntake,saveBookingIntake};
