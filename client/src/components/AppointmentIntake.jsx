import {useEffect,useState} from 'react';
import {requestId} from '../requestId';
const stamp=value=>new Date(value).toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Manila'});
function Reply({item,request,id,onSaved,onBusyChange}) {
  const [response,setResponse]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); onBusyChange?.(true); setError('');
    try { await request(`/appointments/${id}/followups/${item.id}/reply`,'POST',{response}); onSaved(); }
    catch(error) { setError(error.message); }
    finally { setBusy(false); onBusyChange?.(false); }
  }
  return <form onSubmit={submit}><label className="field">Your response<textarea rows={3} required maxLength={2000} value={response} disabled={busy} onChange={event=>setResponse(event.target.value)} /></label>{error && <p role="alert" className="form-error">{error}</p>}<button className="button secondary" disabled={busy}>{busy ? 'Saving response…' : 'Send response'}</button></form>;
}
export default function AppointmentIntake({id,request,staff=false,onBusyChange}) {
  const [open,setOpen]=useState(staff),[data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[attempt,setAttempt]=useState(0);
  const [answers,setAnswers]=useState({}),[consent,setConsent]=useState(false),[question,setQuestion]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const [requestKey,setRequestKey]=useState(requestId);
  function answer(questionId,value) {setAnswers(previous=>({...previous,[questionId]:value}));setRequestKey(requestId());}
  useEffect(()=>{
    if (!open) return;
    const controller=new AbortController(); setLoading(true); setError('');
    // The parent request handles portal and selected-clinic routing.
    request(`/appointments/${id}/intake`,'GET').then(result=>{
      if (controller.signal.aborted) return;
      setData(result);
      const previous=result.submissions[0]?.answers || [];
      setAnswers(Object.fromEntries(previous.map(answer=>[answer.questionId,answer.value]))); setConsent(false); setRequestKey(requestId());
    }).catch(error=>{if (!controller.signal.aborted) setError(error.message);}).finally(()=>{if (!controller.signal.aborted) setLoading(false);});
    return ()=>controller.abort();
  },[id,open,attempt]);
  async function submit(event) {
    event.preventDefault(); setBusy(true); onBusyChange?.(true); setError(''); setNotice('');
    try {
      if (staff) await request(`/appointments/${id}/followups`,'POST',{question,requestKey});
      else await request(`/appointments/${id}/intake`,'PUT',{version:data.template.version,consent,requestKey,answers:data.template.questions.map(q=>({questionId:q.id,value:answers[q.id] || ''}))});
      setQuestion(''); setNotice(staff ? 'Information request saved. The patient can respond from My appointments.' : 'Your intake answers were saved.'); setAttempt(value=>value+1);
    } catch(error) { setError(error.message); }
    finally { setBusy(false); onBusyChange?.(false); }
  }
  return <section className="appointment-intake clinic-detail-section">
    {!staff && <button className="button secondary" aria-expanded={open} disabled={busy} onClick={()=>setOpen(value=>!value)}>{open ? 'Hide intake & follow-up' : 'Intake & clinic follow-up'}</button>}
    {open && <><h3>Patient intake &amp; follow-up</h3><p className="clinic-field-help">Private to this patient and authorized clinic staff. Check this portal for requests and replies.</p>
      {notice && <p className="notice" role="status">{notice}</p>}
      {error && <div role="alert"><p className="form-error">{error}</p><button type="button" className="button secondary" disabled={loading || busy} onClick={()=>setAttempt(value=>value+1)}>Reload intake &amp; follow-up</button></div>}
      {loading ? <p role="status">Loading intake and follow-up…</p> : data && <>
        {!staff && data.template?.enabled && data.template.questions.length>0 && data.canRespond && <form onSubmit={submit} className="intake-form"><fieldset disabled={busy}>
          <h4>Clinic questions</h4><p>{data.template.purpose}</p><p><strong>Record retention: </strong>{data.template.retention}</p>
          {data.template.questions.map(q=><label className="field" key={q.id}>{q.label}{q.required ? ' (required)' : ' (optional)'}{q.type==='yes_no' ? <select aria-label={`${q.label}${q.required ? " (required)" : " (optional)"}`} required={q.required} value={answers[q.id] || ''} onChange={event=>answer(q.id,event.target.value)}><option value="">Choose an answer</option><option value="yes">Yes</option><option value="no">No</option><option value="unsure">Unsure</option></select> : <textarea rows={3} maxLength={2000} required={q.required} value={answers[q.id] || ''} onChange={event=>answer(q.id,event.target.value)} />}</label>)}
          <label className="clinic-check"><input type="checkbox" required checked={consent} onChange={event=>setConsent(event.target.checked)} /><span>I agree to share these answers with this clinic for my appointment, under the purpose and retention policy above.</span></label>
          <button className="button" disabled={busy}>{busy ? 'Saving answers…' : 'Save intake answers'}</button>
        </fieldset></form>}
        {(!data.template?.enabled || !data.template.questions.length) && <p className="muted">The clinic has no intake questionnaire enabled for this visit.</p>}
        {!data.canRespond && <p className="muted">This visit is closed for new answers and requests. Saved information remains available.</p>}
        <h4>Saved intake answers</h4>{!data.submissions.length ? <p className="muted">No intake answers submitted yet.</p> : data.submissions.map((submission,index)=><details className="intake-record" key={submission.id} open={staff && index===0}><summary>{index===0 ? 'Latest submission' : 'Previous submission'} · {stamp(submission.submittedAt)}</summary><p>{submission.author || 'Patient'} · {submission.purpose}</p><p>Record retention: {submission.retention}</p><dl>{submission.answers.map(answer=><div key={answer.questionId}><dt>{answer.label}</dt><dd>{answer.value || 'Not answered'}</dd></div>)}</dl></details>)}
        <h4>Clinic follow-up</h4>{!data.followups.length && <p className="muted">No information requests yet.</p>}
        <div className="followup-list">{data.followups.map(item=><article className="intake-record" key={item.id}><p><strong>{item.requestedBy || 'Clinic staff'}</strong> · {stamp(item.requestedAt)}</p><p className="saved-text">{item.question}</p>{item.response!==null ? <><p><strong>{item.respondedBy || 'Patient'}</strong> · {stamp(item.respondedAt)}</p><p className="saved-text">{item.response}</p></> : <><p className="muted">Awaiting patient response</p>{!staff && data.canRespond && <Reply item={item} request={request} id={id} onBusyChange={onBusyChange} onSaved={()=>{setNotice('Response saved.');setAttempt(value=>value+1);}} />}</>}</article>)}</div>
        {staff && data.canRespond && <form onSubmit={submit}><fieldset disabled={busy}><label className="field">Request information from patient<textarea required rows={3} maxLength={2000} value={question} onChange={event=>{setQuestion(event.target.value);setRequestKey(requestId());}} /></label><p className="clinic-field-help">The request appears in the patient’s appointment. Email and SMS delivery are not available yet.</p><button className="button" disabled={busy}>{busy ? 'Saving request…' : 'Request information'}</button></fieldset></form>}
      </>}
    </>}
  </section>;
}
