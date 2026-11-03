import { useState } from "react";
export default function ClinicChangePolicy({ clinic, request, saved }) {
  const [form, setForm] = useState({ cancelEnabled: clinic.cancelEnabled || false, cancelNoticeHours: clinic.cancelNoticeHours ?? "",
    rescheduleEnabled: clinic.rescheduleEnabled || false, rescheduleNoticeHours: clinic.rescheduleNoticeHours ?? "", terms: clinic.terms || "" });
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const change = (key,value) => setForm(previous => ({ ...previous, [key]: value }));
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    try { await request("/appointment-policy", "PUT", { ...form, cancelNoticeHours: form.cancelEnabled ? Number(form.cancelNoticeHours) : null,
      rescheduleNoticeHours: form.rescheduleEnabled ? Number(form.rescheduleNoticeHours) : null }); saved("Appointment policy saved. New bookings use these terms; bookings with a saved policy retain it."); }
    catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  return <section className="clinic-surface"><h2>Cancellation & rescheduling policy</h2><p>Choose the actions patients may take and how much notice they must give. Patient actions stay unavailable until you enable and configure them.</p>
    <form className="clinic-editor" onSubmit={submit}><fieldset disabled={busy}>
      <label className="clinic-check"><input type="checkbox" checked={form.cancelEnabled} onChange={event => change("cancelEnabled",event.target.checked)} /><span>Allow patient cancellation</span></label>
      {form.cancelEnabled && <label className="field">Cancellation notice (hours)<input required type="number" inputMode="numeric" min="0" max="2160" step="1" value={form.cancelNoticeHours} onChange={event => change("cancelNoticeHours",event.target.value)} /></label>}
      <label className="clinic-check"><input type="checkbox" checked={form.rescheduleEnabled} onChange={event => change("rescheduleEnabled",event.target.checked)} /><span>Allow patient reschedule requests</span></label>
      {form.rescheduleEnabled && <label className="field">Reschedule notice (hours)<input required type="number" inputMode="numeric" min="0" max="2160" step="1" value={form.rescheduleNoticeHours} onChange={event => change("rescheduleNoticeHours",event.target.value)} /></label>}
      <p className="muted">Use whole hours from 0 to 2,160. Zero permits an action until the visit starts. Clinic staff can cancel an upcoming visit with a recorded reason. Reschedules require staff approval and keep the same dentist, treatment, estimate, and payment records.</p>
      <label className="field">Appointment change terms<textarea aria-label="Appointment change terms" rows={6} required={form.cancelEnabled || form.rescheduleEnabled} maxLength={5000} value={form.terms} onChange={event => change("terms",event.target.value)} /></label>
      <p className="muted">Explain cancellation, rescheduling, and deposit consequences consistently with your payment/refund terms. This website does not automatically refund or forfeit deposits. Saved booking policies are preserved; older bookings without a saved policy use the clinic’s current terms.</p>
      {error && <p role="alert" className="form-error">{error}</p>}<button className="button" disabled={busy}>{busy ? "Saving…" : "Save appointment policy"}</button>
    </fieldset></form>
  </section>;
}
