import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { api } from "../api";
import { PageTitle } from "../components/Shared";
import { useAuth } from "../hooks/useAuth";
import { useClinics } from "../hooks/useClinics";

const money = value => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);
// getRandomValues also works on the HTTP LAN preview, where randomUUID may be unavailable.
function requestKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(value => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export default function Booking() {
  const { session, refresh } = useAuth();
  const directory = useClinics();
  const params = new URLSearchParams(useLocation().search);
  const [selection, setSelection] = useState({ clinicId: params.get("clinic") || "", serviceId: "", dentistId: "", date: "", time: "" });
  const [contact, setContact] = useState({ email: session.user.email || "", phone: "", notes: "" });
  const [key, setKey] = useState(requestKey);
  const [options, setOptions] = useState({ loading: false, error: "", data: null });
  const [times, setTimes] = useState({ loading: false, error: "", slots: [], service: null });
  const [optionsAttempt, setOptionsAttempt] = useState(0);
  const [slotAttempt, setSlotAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);
  const { clinicId, serviceId, dentistId, date } = selection;
  useEffect(() => {
    if (!clinicId || !directory.clinics.some(item => item.id === clinicId)) {
      setOptions({ loading: false, error: "", data: null }); return;
    }
    const controller = new AbortController();
    setOptions({ loading: true, error: "", data: null });
    api(`/workspaces/patient/booking-options?clinicId=${encodeURIComponent(clinicId)}`, { signal: controller.signal })
      .then(data => {
        if (controller.signal.aborted) return;
        setOptions({ loading: false, error: "", data });
        setSelection(previous => ({ ...previous, serviceId: "", dentistId: "", time: "", date: data.minDate }));
        setContact(previous => ({ ...previous, phone: previous.phone || data.patient?.phone || "" }));
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          setOptions({ loading: false, error: error.message, data: null });
          if (error.status === 401) refresh().catch(() => {});
        }
      });
    return () => controller.abort();
  }, [clinicId, optionsAttempt, directory.clinics, refresh]);
  useEffect(() => {
    setSelection(previous => ({ ...previous, time: "" }));
    if (!options.data || options.loading || !serviceId || !dentistId || !date) {
      setTimes({ loading: false, error: "", slots: [], service: null }); return;
    }
    const controller = new AbortController();
    setTimes({ loading: true, error: "", slots: [], service: null });
    const query = new URLSearchParams({ clinicId, serviceId, dentistId, date });
    api(`/workspaces/patient/availability?${query}`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setTimes({ loading: false, error: "", ...data }); })
      .catch(error => {
        if (!controller.signal.aborted) {
          setTimes({ loading: false, error: error.message, slots: [], service: null });
          if (error.status === 401) refresh().catch(() => {});
        }
      });
    return () => controller.abort();
  }, [clinicId, serviceId, dentistId, date, options.data, slotAttempt, refresh]);
  function select(name, value) {
    setKey(requestKey()); setError("");
    setSelection(previous => ({ ...previous, [name]: value, time: "",
      ...(name === "clinicId" ? { serviceId: "", dentistId: "", date: "" } : {}),
      ...(name === "serviceId" ? { dentistId: "" } : {}),
    }));
  }
  async function submit(event) {
    event.preventDefault();
    if (!times.service || !times.slots.some(slot => slot.time === selection.time)) { setError("Choose an available appointment time."); return; }
    setBusy(true); setError("");
    try {
      const data = await api("/workspaces/patient/appointments", { method: "POST", body: {
        ...selection, ...contact, requestKey: key, expectedPrice: String(times.service.price), expectedDuration: times.service.duration,
      } });
      setReceipt(data.appointment);
    } catch (error) {
      setError(error.message);
      if (error.status === 409) setSlotAttempt(value => value + 1);
      if (error.status === 401) refresh().catch(() => {});
    } finally { setBusy(false); }
  }
  if (receipt) return <div className="wrap page"><section className="panel success-panel">
    <span className="success-icon"><CheckCircle2 size={40} /></span>
    <p className="eyebrow">{receipt.appointmentCode}</p>
    <h1>Your appointment request is saved.</h1>
    <p>{receipt.clinicName} · {receipt.date} · {receipt.time} (Philippine time)</p>
    <p>{receipt.services.join(", ")} · {receipt.dentistName}</p>
    <p>Estimated cost: {money(receipt.total)}</p>
    <p className="notice">Status: {receipt.status.replaceAll("_", " ")}. The clinic reviews your request first. After acceptance, open your appointment’s payment details for the clinic’s GCash or Pay at clinic options.</p>
    <Link className="button" to="/patient/appointments">View my appointments</Link>
  </section></div>;
  const data = options.data;
  const service = times.service || data?.services.find(item => item.id === serviceId);
  const dentists = data?.dentists.filter(item => item.serviceIds.includes(serviceId)) || [];
  const availableServices = data?.services.filter(item => data.dentists.some(dentist => dentist.serviceIds.includes(item.id))) || [];
  return <div className="wrap page">
    <PageTitle eyebrow="PLAN YOUR NEXT VISIT" title="Request a dental appointment." text="Choose a treatment and an available time. Your clinic will review the request. All times are Philippine time (UTC+8)." />
    {directory.loading ? <p role="status">Loading clinics…</p> : directory.error ? <div className="panel" role="alert"><p>We couldn’t load the clinic directory.</p><button className="button secondary" onClick={directory.retry}>Reload clinics</button></div> : directory.clinics.length === 0 ? <div className="panel empty"><CalendarDays size={36} /><h2>No clinics available for booking yet.</h2><p>Approved clinics will appear here when they join DentaBook.</p></div> : <form onSubmit={submit}>
      <fieldset className="booking-fieldset" disabled={busy}>
        <div className="booking-layout">
          <section className="panel">
            <h2>Your visit</h2>
            <label className="field">Clinic<select aria-label="Clinic" value={clinicId} onChange={event => select("clinicId", event.target.value)} required>
              <option value="">Choose a clinic</option>{directory.clinics.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}
            </select></label>
            {clinicId && !directory.clinics.some(item => item.id === clinicId) && <p className="notice">The selected clinic is unavailable. Choose another clinic.</p>}
            {options.loading ? <p role="status">Loading booking options…</p> : options.error ? <div role="alert"><p>{options.error}</p><button type="button" className="button secondary" onClick={() => setOptionsAttempt(value => value + 1)}>Reload booking options</button></div> : data && <>
              <p className="muted">{data.clinic.address}</p>
              {availableServices.length === 0 ? <p className="notice">This clinic has no services assigned to a published dentist yet. Contact the clinic or choose another clinic.</p> : <>
                <label className="field">Treatment<select aria-label="Treatment" value={serviceId} onChange={event => select("serviceId", event.target.value)} required>
                  <option value="">Choose a treatment</option>{availableServices.map(item => <option value={item.id} key={item.id}>{item.name} · {money(item.price)}</option>)}
                </select></label>
                {serviceId && <label className="field">Dentist<select aria-label="Dentist" value={dentistId} onChange={event => select("dentistId", event.target.value)} required>
                  <option value="">Choose a dentist</option>{dentists.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}
                </select></label>}
                {dentistId && <>
                  <label className="field">Visit date<input type="date" value={date} min={data.minDate} max={data.maxDate} onChange={event => select("date", event.target.value)} required /></label>
                  <div className="booking-times" aria-label="Available appointment times">
                    <h3>Available times</h3>
                    {times.loading ? <p role="status">Checking available times…</p> : times.error ? <p className="form-error" role="alert">{times.error}</p> : !times.slots.length ? <p className="notice">No available times on this date. Choose another date or dentist.</p> : <div className="booking-time-grid">{times.slots.map(slot => <button type="button" key={slot.time} className={`button ${selection.time === slot.time ? "" : "secondary"}`} aria-pressed={selection.time === slot.time} onClick={() => {
                      setSelection(previous => ({ ...previous, time: slot.time })); setKey(requestKey()); setError("");
                    }}>{slot.time}–{slot.end}</button>)}</div>}
                    <button type="button" className="button secondary" disabled={times.loading} onClick={() => setSlotAttempt(value => value + 1)}>Refresh available times</button>
                    <p className="summary-note">Book up to 90 days ahead, at least 15 minutes before the visit. A time is reserved only when your request is saved.</p>
                  </div>
                </>}
              </>}
            </>}
          </section>
          <section className="panel booking-summary">
            <h2>Your details and estimate</h2>
            <p>Booking for {session.user.name}</p>
            <label className="field">Contact email<input type="email" autoComplete="email" value={contact.email} required maxLength={254} aria-describedby="booking-email-help" onChange={event => { setContact(previous => ({ ...previous, email: event.target.value })); setKey(requestKey()); }} /></label>
            <p className="summary-note" id="booking-email-help">Enter the email address the clinic should use for this appointment. Changing it here does not change your account email.</p>
            <label className="field">Contact phone<input type="tel" autoComplete="tel" value={contact.phone} maxLength={30} required onChange={event => { setContact(previous => ({ ...previous, phone: event.target.value })); setKey(requestKey()); }} /></label>
            <label className="field">Visit notes (optional)<textarea aria-label="Visit notes (optional)" rows={4} maxLength={2000} value={contact.notes} onChange={event => { setContact(previous => ({ ...previous, notes: event.target.value })); setKey(requestKey()); }} /></label>
            <p className="summary-note">Your contact details and notes are shared with this clinic for your visit.</p>
            {service ? <p className="notice">Estimated treatment cost: {money(service.price)} · {service.duration} minutes</p> : <p className="muted">Choose a treatment to see its estimated cost.</p>}
            <p className="summary-note">Final treatment and cost depend on the clinic’s assessment. This request does not collect payment or confirm a visit.</p>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button full" disabled={busy || times.loading || !selection.time || !data || !contact.email.trim() || !!options.error} aria-busy={busy}>{busy ? "Sending request…" : "Send appointment request"}</button>
            <Link className="text-link" to="/patient/appointments">View my saved requests</Link>
          </section>
        </div>
      </fieldset>
    </form>}
  </div>;
}
