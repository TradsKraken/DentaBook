import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Check, Clock3, Mail, Phone, RefreshCw, Search, UserRound, X } from "lucide-react";
import { ClinicDrawer, ClinicEmpty, ClinicStatus } from "./ClinicUi";
const statuses = [["pending_review", "Awaiting review"], ["accepted", "Accepted"], ["declined", "Declined"], ["all", "All statuses"], ["confirmed", "Confirmed"], ["completed", "Completed"], ["cancelled", "Cancelled"], ["rescheduled", "Rescheduled"]];
const money = value => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);
const displayDate = value => new Date(`${value}T12:00:00+08:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });
const statusLabel = value => statuses.find(item => item[0] === value)?.[1] || value.replaceAll("_", " ");
export default function ClinicInbox({ request, onReviewed }) {
  const [status, setStatus] = useState("pending_review"), [query, setQuery] = useState(""), [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ loading: true, error: "", appointments: [] });
  const [selected, setSelected] = useState(null), [decision, setDecision] = useState(null), [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true; setState({ loading: true, error: "", appointments: [] });
    request(`/appointments?status=${encodeURIComponent(status)}`, "GET")
      .then(data => { if (active) {
        setState({ loading: false, error: "", appointments: data.appointments });
        if (Number.isInteger(data.pendingAppointments)) onReviewed(data.pendingAppointments);
      } })
      .catch(error => { if (active) setState({ loading: false, error: error.message, appointments: [] }); });
    return () => { active = false; };
  }, [status, attempt]);
  function close() { setSelected(null); setDecision(null); setNotes(""); setError(""); }
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const data = await request(`/appointments/${selected.id}/review`, "PUT", { decision, notes });
      setNotice(`Request ${selected.code} ${decision}.`); close(); setAttempt(value => value + 1); onReviewed(data.pendingAppointments);
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  const results = state.appointments.filter(item => `${item.code} ${item.patientName} ${item.dentistName || ""} ${item.services.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="clinic-surface clinic-inbox" aria-label="Appointment requests">
    <div className="clinic-toolbar"><label className="clinic-search"><Search size={18} /><input aria-label="Search requests" placeholder="Search patient, treatment, or reference…" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <select className="clinic-appointment-filter" aria-label="Appointment status" value={status} disabled={busy} onChange={event => { setStatus(event.target.value); close(); setNotice(""); }}>{statuses.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
      <button className="button secondary" disabled={busy || state.loading} onClick={() => { close(); setAttempt(value => value + 1); }}><RefreshCw size={16} />Refresh requests</button>
    </div>
    {notice && <div className="clinic-feedback" role="status"><Check size={18} />{notice}</div>}
    {state.loading ? <div className="clinic-loading" role="status">Loading appointment requests…</div> : state.error ? <div className="clinic-loading" role="alert"><h3>Requests are unavailable</h3><p>{state.error}</p></div> : !results.length ? <ClinicEmpty icon={query ? Search : CalendarDays} title={query ? "No matching requests" : "No appointment requests match this status."} action={query ? <button className="button secondary" onClick={() => setQuery("")}>Clear search</button> : null}>{query ? "Search the loaded requests by patient, treatment, dentist, or reference." : status === "pending_review" ? "Patient requests will appear here when they are ready for your review." : "Choose another status to see your clinic’s saved requests."}</ClinicEmpty> : <div className="clinic-table-region" role="region" aria-label="Saved appointment requests" tabIndex={0}>
      <table className="clinic-table clinic-appointment-table"><thead><tr><th>Patient / reference</th><th>Visit</th><th>Dentist / treatment</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{results.map(item => <tr key={item.id}>
        <td className="clinic-table-name"><div className="clinic-record-identity"><span className="clinic-avatar" aria-hidden="true"><UserRound size={18} /></span><div><h3>{item.patientName}</h3><p className="clinic-reference">{item.code}</p></div></div></td>
        <td data-label="Visit"><strong>{displayDate(item.date)}</strong><small className="clinic-cell-secondary">{item.time}–{item.end}</small></td>
        <td data-label="Dentist / treatment"><span>{item.dentistName || "Dentist unavailable"}</span><small className="clinic-cell-secondary">{item.services.join(", ") || "Service details unavailable"}</small></td>
        <td><ClinicStatus status={item.status}>{statusLabel(item.status)}</ClinicStatus></td>
        <td className="clinic-table-actions"><button className={`clinic-row-button ${item.status === "pending_review" ? "clinic-row-primary" : ""}`} aria-label={`View ${item.code}`} onClick={() => { setSelected(item); setDecision(null); setNotes(""); setError(""); }}>{item.status === "pending_review" ? "Review request" : "View details"}<ArrowRight size={15} /></button></td>
      </tr>)}</tbody></table>
    </div>}
    <footer className="clinic-list-footer"><span>{results.length} of {state.appointments.length} loaded requests · Latest 100 for this status</span><span><Clock3 size={14} />Philippine time</span></footer>
    {selected && <ClinicDrawer title="Appointment details" busy={busy} onClose={close}>
      <div className="clinic-patient-heading"><span className="clinic-avatar clinic-avatar-large" aria-hidden="true"><UserRound size={24} /></span><div><h3>{selected.patientName}</h3><p>{selected.code}</p></div><ClinicStatus status={selected.status}>{statusLabel(selected.status)}</ClinicStatus></div>
      <section className="clinic-detail-section"><h3>Visit information</h3><dl className="clinic-detail-list"><div><dt>Date</dt><dd>{displayDate(selected.date)}</dd></div><div><dt>Time</dt><dd>{selected.time}–{selected.end} · Philippine time</dd></div><div><dt>Dentist</dt><dd>{selected.dentistName || "Dentist unavailable"}</dd></div><div><dt>Treatment</dt><dd>{selected.services.join(", ") || "Service details unavailable"}</dd></div><div><dt>Estimated cost</dt><dd>{money(selected.total)}</dd></div></dl></section>
      <section className="clinic-detail-section"><h3>Patient contact</h3><a className="clinic-contact-link" href={`mailto:${selected.email}`}><Mail size={17} />{selected.email}</a><a className="clinic-contact-link" href={`tel:${selected.phone.replace(/[^+0-9]/g, "")}`}><Phone size={17} />{selected.phone}</a>
        {selected.notes && <div className="clinic-patient-note"><strong>Patient’s note</strong><p>{selected.notes}</p></div>}
        {selected.reviewNotes && <div className="clinic-patient-note"><strong>Clinic’s note</strong><p>{selected.reviewNotes}</p></div>}
      </section>
      {selected.status === "pending_review" && <section className="clinic-detail-section"><h3>Review this request</h3><p className="clinic-field-help">Check the patient’s details before choosing a decision. Pending requests reserve the dentist’s time.</p>
        {!decision ? <div className="clinic-decision-actions"><button className="button" aria-label={`Accept ${selected.code}`} onClick={() => setDecision("accepted")}><Check size={17} />Accept request</button><button className="button secondary clinic-decline-button" aria-label={`Decline ${selected.code}`} onClick={() => setDecision("declined")}><X size={17} />Decline request</button></div> : <form className="clinic-review-form" onSubmit={submit}>
          <h3>{decision === "accepted" ? "Accept this request?" : "Decline this request?"}</h3><p>{decision === "accepted" ? "The patient will see your acceptance. Arrange payment and final confirmation directly; online payments are not available." : "The patient will see your reason. Declining releases this time for other patients."}</p>
          <label className="field">{decision === "declined" ? "Reason for declining" : "Note to patient (optional)"}<textarea aria-label={decision === "declined" ? "Reason for declining" : "Note to patient (optional)"} rows={3} value={notes} maxLength={2000} required={decision === "declined"} disabled={busy} onChange={event => setNotes(event.target.value)} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="clinic-editor-actions"><button type="button" className="button secondary" disabled={busy} onClick={() => { setDecision(null); setError(""); }}>Cancel review</button><button className="button" disabled={busy} aria-busy={busy}>{busy ? "Saving decision…" : decision === "accepted" ? "Confirm acceptance" : "Confirm decline"}</button></div>
        </form>}
      </section>}
    </ClinicDrawer>}
  </section>;
}
