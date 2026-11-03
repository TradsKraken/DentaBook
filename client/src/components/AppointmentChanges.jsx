import { useEffect, useState } from "react";
const requestKey = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(value => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
};
export function ChangePolicySummary({ policy }) {
  if (!policy) return null;
  return <section className="appointment-policy-summary"><h3>Appointment change policy</h3>
    <p>{policy.cancelEnabled ? `Patient cancellation: at least ${policy.cancelNoticeHours} hours before the visit.` : "Patient cancellation is unavailable. Contact the clinic."}</p>
    <p>{policy.rescheduleEnabled ? `Reschedule requests: at least ${policy.rescheduleNoticeHours} hours before the visit, subject to clinic approval.` : "Patient rescheduling is unavailable. Contact the clinic."}</p>
    {policy.terms && <p className="payment-terms">{policy.terms}</p>}
  </section>;
}
export default function AppointmentChanges({ id, request, staff = false, onChanged, onBusyChange }) {
  const [expanded, setExpanded] = useState(staff), [attempt, setAttempt] = useState(0), [state, setState] = useState({ loading: true });
  const [action, setAction] = useState(""), [reason, setReason] = useState(""), [date, setDate] = useState(""), [time, setTime] = useState("");
  const [slots, setSlots] = useState({ loading: false, slots: [] }), [slotAttempt, setSlotAttempt] = useState(0);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState(""), [key, setKey] = useState(requestKey);
  const base = `/appointments/${id}`;
  useEffect(() => {
    if (!expanded) return;
    let active = true; setState({ loading: true });
    request(`${base}/changes`).then(data => { if (active) setState(data); }).catch(error => { if (active) setState({ error: error.message }); });
    return () => { active = false; };
  }, [id, expanded, attempt]);
  useEffect(() => {
    setTime("");
    if (action !== "reschedule" || !date) { setSlots({ loading: false, slots: [] }); return; }
    let active = true; setSlots({ loading: true, slots: [] });
    request(`${base}/reschedule-availability?date=${encodeURIComponent(date)}`).then(data => { if (active) setSlots({ ...data, loading: false }); })
      .catch(error => { if (active) setSlots({ error: error.message, loading: false, slots: [] }); });
    return () => { active = false; };
  }, [action, date, slotAttempt, id]);
  function choose(value) { setAction(value); setReason(""); setDate(""); setTime(""); setError(""); setNotice(""); setKey(requestKey()); }
  async function perform(path, body, message) {
    setBusy(true); onBusyChange?.(true); setError("");
    try {
      await request(`${base}${path}`, "POST", body);
      const data = await request(`${base}/changes`); setState(data); setNotice(message); choose(""); setNotice(message); onChanged?.(data.appointment);
    } catch (error) { setError(error.message); if (error.status === 409) setSlotAttempt(value => value + 1); }
    finally { setBusy(false); onBusyChange?.(false); }
  }
  function submit(event) {
    event.preventDefault();
    if (action === "cancel") return perform("/cancel", { reason, requestKey: key, policyHash: state.policyHash }, "Appointment cancelled. Contact the clinic for any refund review.");
    if (action === "reschedule") return perform("/reschedule", { reason, date, time, requestKey: key, policyHash: state.policyHash }, "Reschedule request saved. Your original visit stays reserved until the clinic approves a replacement.");
    return perform(`/changes/${action}/review`, { decision: time, notes: reason }, "Reschedule decision saved.");
  }
  if (!expanded) return <button className="button secondary" onClick={() => setExpanded(true)}>Manage appointment</button>;
  const today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0,10), maxDate = new Date(Date.now()+8*3600000+90*86400000).toISOString().slice(0,10);
  const pending = state.changes?.find(change => change.status === "pending");
  return <section className="appointment-changes" aria-label="Appointment changes">
    <div className="form-actions"><h3>{staff ? "Changes & cancellation" : "Manage appointment"}</h3><button className="button secondary" disabled={busy || state.loading} onClick={() => { setAttempt(value => value + 1); choose(""); }}>Refresh changes</button></div>
    {state.loading ? <p role="status">Loading appointment changes…</p> : state.error ? <div role="alert"><p>{state.error}</p><button className="button secondary" onClick={() => setAttempt(value => value + 1)}>Retry appointment changes</button></div> : <>
      <ChangePolicySummary policy={state.policy} />
      <p className="muted">{state.unavailableReason}</p>
      {state.appointment.refundReviewRequired && <p className="notice">Payment or refund review required. Existing payment records and receipts are preserved; cancellation does not record a refund.</p>}
      {notice && <p className="notice" role="status">{notice}</p>}
      {!action && <div className="form-actions">
        {(staff ? state.canStaffCancel : state.canCancel) && <button className="button secondary" disabled={busy} onClick={() => choose("cancel")}>Cancel appointment</button>}
        {!staff && state.canReschedule && <button className="button secondary" disabled={busy} onClick={() => choose("reschedule")}>Request reschedule</button>}
      </div>}
      {action && <form onSubmit={submit} className="appointment-change-form"><fieldset disabled={busy}>
        <h3>{action === "cancel" ? "Cancel this appointment?" : action === "reschedule" ? "Request another time" : "Review reschedule request"}</h3>
        {action === "cancel" && <p>The reserved time will be released. Payment records and receipts will remain available. Refunds require clinic review.</p>}
        {action === "reschedule" && <><p>Choose another time with the same clinic, dentist, and treatment. Your original estimate and deposit remain attached to this appointment. The requested time is reserved only when the clinic approves it.</p>
          <label className="field">Replacement date<input type="date" required min={today} max={maxDate} value={date} onChange={event => { setDate(event.target.value); setKey(requestKey()); }} /></label>
          {date && <><h4>Replacement times</h4>{slots.loading ? <p role="status">Checking replacement times…</p> : slots.error ? <p role="alert">{slots.error}</p> : !slots.slots.length ? <p>No replacement times on this date. Choose another date.</p> : <div className="booking-time-grid">{slots.slots.map(slot => <button type="button" className={`button ${time === slot.time ? "" : "secondary"}`} aria-pressed={time === slot.time} key={slot.time} onClick={() => { setTime(slot.time); setKey(requestKey()); }}>{slot.time}–{slot.end}</button>)}</div>}<button type="button" className="button secondary" onClick={() => setSlotAttempt(value => value + 1)} disabled={slots.loading}>Refresh replacement times</button></>}
        </>}
        {!["cancel","reschedule"].includes(action) && <label className="field">Reschedule decision<select aria-label="Reschedule decision" required value={time} onChange={event => setTime(event.target.value)}><option value="">Choose a decision</option><option value="approved">Approve replacement time</option><option value="declined">Decline and keep original visit</option></select></label>}
        <label className="field">{staff && !["cancel","reschedule"].includes(action) ? "Decision note" : "Reason for change"}<textarea aria-label={staff && !["cancel","reschedule"].includes(action) ? "Decision note" : "Reason for change"} required rows={3} maxLength={2000} value={reason} onChange={event => { setReason(event.target.value); setKey(requestKey()); }} /></label>
        <div className="form-actions"><button type="button" className="button secondary" onClick={() => choose("")}>Keep current appointment</button><button className="button" disabled={busy || !reason.trim() || (action !== "cancel" && !time) || (action === "reschedule" && slots.loading)}>{busy ? "Saving…" : action === "cancel" ? "Confirm cancellation" : action === "reschedule" ? "Send reschedule request" : "Save reschedule decision"}</button></div>
      </fieldset></form>}
      {error && <p role="alert" className="form-error">{error}</p>}
      {!!state.changes.length && <section className="appointment-change-history"><h3>Change history</h3>{state.changes.map(change => <div className="appointment-change-record" key={change.id}>
        <strong>{change.kind === "cancel" ? "Cancellation" : "Reschedule"} · {change.status}</strong>
        <p>Original: {change.originalDate} · {change.originalTime}–{change.originalEnd}</p>
        {change.requestedDate && <p>Requested: {change.requestedDate} · {change.requestedTime}–{change.requestedEnd}</p>}
        <p>{change.reason}</p>{change.reviewNotes && <p>Clinic note: {change.reviewNotes}</p>}
        <p className="muted">Requested by {change.requestedBy || (change.requesterRole === "patient" ? "patient" : "clinic staff")} · {new Date(change.requestedAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })} (Philippine time)</p>
        {change.reviewedAt && <p className="muted">{change.reviewedBy ? `Reviewed by ${change.reviewedBy} · ` : "Updated: "}{new Date(change.reviewedAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}</p>}
        {change.status === "pending" && !action && (staff ? <button className="button" disabled={busy} onClick={() => choose(change.id)}>Review reschedule</button> : <button className="button secondary" disabled={busy} onClick={() => perform(`/changes/${change.id}/withdraw`, {}, "Reschedule request withdrawn. Your original visit remains reserved.")}>Withdraw reschedule request</button>)}
      </div>)}</section>}
    </>}
  </section>;
}
