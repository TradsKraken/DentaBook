import { useEffect, useState } from "react";
const statuses = [["pending_review", "Awaiting review"], ["accepted", "Accepted"], ["declined", "Declined"], ["all", "All statuses"], ["confirmed", "Confirmed"], ["completed", "Completed"], ["cancelled", "Cancelled"], ["rescheduled", "Rescheduled"]];
const money = value => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);
export default function ClinicInbox({ request, onReviewed }) {
  const [status, setStatus] = useState("pending_review");
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ loading: true, error: "", appointments: [] });
  const [review, setReview] = useState(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    setState({ loading: true, error: "", appointments: [] });
    request(`/appointments?status=${encodeURIComponent(status)}`, "GET")
      .then(data => { if (active) {
        setState({ loading: false, error: "", appointments: data.appointments });
        if (Number.isInteger(data.pendingAppointments)) onReviewed(data.pendingAppointments);
      } })
      .catch(error => { if (active) setState({ loading: false, error: error.message, appointments: [] }); });
    return () => { active = false; };
  }, [status, attempt]);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const data = await request(`/appointments/${review.id}/review`, "PUT", { decision: review.decision, notes });
      setNotice(`Request ${review.code} ${review.decision}.`); setReview(null); setNotes("");
      setAttempt(value => value + 1); onReviewed(data.pendingAppointments);
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  return <div className="clinic-inbox">
    <h3>Appointment requests</h3>
    <p className="muted">Your latest 100 requests for the selected status. Times are Philippine time. Pending and accepted requests reserve the dentist’s time.</p>
    <div className="clinic-inbox-filters">
      <label className="field">Appointment status<select aria-label="Appointment status" value={status} disabled={busy} onChange={event => { setStatus(event.target.value); setReview(null); setNotice(""); }}>{statuses.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <button className="button secondary" disabled={busy || state.loading} onClick={() => { setReview(null); setAttempt(value => value + 1); }}>Refresh requests</button>
    </div>
    {notice && <p className="notice" role="status">{notice}</p>}
    {state.loading ? <p role="status">Loading appointment requests…</p> : state.error ? <p className="form-error" role="alert">{state.error}</p> : state.appointments.length === 0 ? <p className="clinic-empty">No appointment requests match this status.</p> : <div className="clinic-inbox-list">{state.appointments.map(item => <article className="clinic-record" key={item.id}>
      <p className="eyebrow">{item.code}</p><h4>{item.patientName}</h4>
      <p>{item.date} · {item.time}–{item.end}</p><p>{item.dentistName || "Dentist unavailable"} · {item.services.join(", ") || "Service details unavailable"}</p>
      <p>Estimated cost: {money(item.total)}</p>
      <p><a className="text-link" href={`mailto:${item.email}`}>{item.email}</a></p>
      <p><a className="text-link" href={`tel:${item.phone.replace(/[^+0-9]/g, "")}`}>{item.phone}</a></p>
      {item.notes && <p className="clinic-visit-notes"><strong>Visit notes: </strong>{item.notes}</p>}
      <p className="notice">Status: {item.status.replaceAll("_", " ")}</p>
      {item.reviewNotes && <p><strong>Clinic’s note: </strong>{item.reviewNotes}</p>}
      {item.status === "pending_review" && <div className="clinic-actions">
        <button className="button" disabled={busy} aria-label={`Accept ${item.code}`} onClick={() => { setReview({ ...item, decision: "accepted" }); setNotes(""); setError(""); }}>Review to accept</button>
        <button className="button secondary" disabled={busy} aria-label={`Decline ${item.code}`} onClick={() => { setReview({ ...item, decision: "declined" }); setNotes(""); setError(""); }}>Review to decline</button>
      </div>}
      {review?.id === item.id && <form className="clinic-review-form" onSubmit={submit}>
        <h3>{review.decision === "accepted" ? "Accept this request?" : "Decline this request?"}</h3>
        <p>{review.decision === "accepted" ? "The patient will see that the clinic accepted this request. Arrange payment and final confirmation directly; online payments are not available." : "The patient will see your reason. Declining releases this time for other patients."}</p>
        <label className="field">{review.decision === "declined" ? "Reason for declining" : "Note to patient (optional)"}<textarea aria-label={review.decision === "declined" ? "Reason for declining" : "Note to patient (optional)"} rows={3} value={notes} maxLength={2000} required={review.decision === "declined"} disabled={busy} onChange={event => setNotes(event.target.value)} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="clinic-actions"><button className="button" disabled={busy} aria-busy={busy}>{busy ? "Saving decision…" : review.decision === "accepted" ? "Confirm acceptance" : "Confirm decline"}</button>
          <button type="button" className="button secondary" disabled={busy} onClick={() => setReview(null)}>Cancel review</button></div>
      </form>}
    </article>)}</div>}
  </div>;
}
