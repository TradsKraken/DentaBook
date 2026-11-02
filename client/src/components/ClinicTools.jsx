import { useEffect, useState } from "react";
import { api } from "../api";

const categories = ["Preventive", "Restorative", "Cosmetic", "Surgical", "Orthodontic", "General"];
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const money = value => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);
const emptyService = { name: "", category: "General", description: "", price: "", duration: 30, isActive: true };
const emptyDentist = { name: "", title: "", credentials: "", isActive: true };

function Input({ label, multiline, ...props }) {
  return <label className="field">{label}{multiline ? <textarea rows={4} {...props} /> : <input {...props} />}</label>;
}
function Published({ checked, onChange, noun }) {
  return <label className="clinic-check"><input type="checkbox" checked={checked} onChange={onChange} />Publish this {noun} on the clinic profile</label>;
}
function Editor({ title, submitLabel, request, body, onSaved, children, onCancel }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError("");
    try { await request(body); onSaved(); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  return <form className="clinic-editor" onSubmit={submit}>
    <h3>{title}</h3>
    <fieldset disabled={busy}>
      {children}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="clinic-actions">
        <button className="button" disabled={busy} aria-busy={busy}>{busy ? "Saving…" : submitLabel}</button>
        {onCancel && <button type="button" className="button secondary" onClick={onCancel}>Cancel editing</button>}
      </div>
    </fieldset>
  </form>;
}
function Profile({ clinic, request, saved }) {
  const [form, setForm] = useState({ name: clinic.name, description: clinic.description || "", address: clinic.address, phone: clinic.phone, email: clinic.email });
  const change = event => setForm({ ...form, [event.target.name]: event.target.value });
  return <Editor title="Edit clinic profile" submitLabel="Save clinic profile" request={body => request("/profile", "PUT", body)} body={form} onSaved={() => saved("Clinic profile saved. Your public listing has been updated.")}>
    <p className="muted">These details appear in the public directory. Your account sign-in email stays separate.</p>
    <Input label="Clinic name" name="name" value={form.name} onChange={change} required maxLength={200} />
    <Input label="About your clinic" name="description" value={form.description} onChange={change} multiline maxLength={5000} />
    <Input label="Clinic address" name="address" value={form.address} onChange={change} multiline required maxLength={1000} />
    <Input label="Public phone number" name="phone" type="tel" value={form.phone} onChange={change} required maxLength={30} />
    <Input label="Public email address" name="email" type="email" value={form.email} onChange={change} required maxLength={254} />
  </Editor>;
}
function ServiceEditor({ item, request, saved, cancel }) {
  const [form, setForm] = useState(item ? { ...item, price: String(item.price), description: item.description || "" } : { ...emptyService });
  const change = event => setForm({ ...form, [event.target.name]: event.target.value });
  return <Editor title={item ? "Edit service" : "Add a service"} submitLabel={item ? "Save service" : "Add service"} request={body => request(`/services${item ? `/${item.id}` : ""}`, item ? "PUT" : "POST", { ...body, duration: Number(body.duration) })} body={form} onSaved={() => saved("Service saved. Published services appear in your listing and cost calculator.")} onCancel={item ? cancel : undefined}>
    <Input label="Service name" name="name" value={form.name} onChange={change} required maxLength={200} />
    <label className="field">Service category<select aria-label="Service category" name="category" value={form.category} onChange={change}>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
    <Input label="Service description" name="description" value={form.description} onChange={change} multiline maxLength={3000} />
    <Input label="Estimated price (PHP)" name="price" type="number" inputMode="decimal" min="0" max="99999999.99" step="0.01" value={form.price} onChange={change} required />
    <Input label="Duration (minutes)" name="duration" type="number" inputMode="numeric" min="5" max="480" step="1" value={form.duration} onChange={change} required />
    <Published noun="service" checked={form.isActive} onChange={event => setForm({ ...form, isActive: event.target.checked })} />
    <p className="summary-note">Uncheck to hide a service while keeping its saved details and appointment history.</p>
  </Editor>;
}
function DentistEditor({ item, request, saved, cancel }) {
  const [form, setForm] = useState(item ? { ...item, credentials: item.credentials || "" } : { ...emptyDentist });
  const change = event => setForm({ ...form, [event.target.name]: event.target.value });
  return <Editor title={item ? "Edit dentist" : "Add a dentist"} submitLabel={item ? "Save dentist" : "Add dentist"} request={body => request(`/dentists${item ? `/${item.id}` : ""}`, item ? "PUT" : "POST", body)} body={form} onSaved={() => saved("Dentist saved. Published dentists appear on your public profile.")} onCancel={item ? cancel : undefined}>
    <Input label="Dentist name" name="name" value={form.name} onChange={change} required maxLength={150} />
    <Input label="Professional title" name="title" value={form.title} onChange={change} required maxLength={100} />
    <Input label="Credentials and qualifications" name="credentials" value={form.credentials} onChange={change} multiline maxLength={3000} />
    <p className="summary-note">Enter accurate, verified qualifications for this dentist. A profile does not create a staff sign-in account.</p>
    <Published noun="dentist" checked={form.isActive} onChange={event => setForm({ ...form, isActive: event.target.checked })} />
  </Editor>;
}
function Catalog({ type, data, request, saved }) {
  const [editing, setEditing] = useState(null);
  const [version, setVersion] = useState(0);
  const services = type === "services";
  const EditorComponent = services ? ServiceEditor : DentistEditor;
  return <div className="clinic-tool-grid">
    <div className="clinic-records">
      <h3>{services ? "Your services" : "Your dentists"}</h3>
      <p className="muted">{services ? "Manage the treatments and prices patients can browse." : "Manage the dentists shown on your clinic profile."}</p>
      {data.length === 0 ? <p className="clinic-empty">{services ? "No services saved yet. Add your first service below." : "No dentists saved yet. Add your first dentist below."}</p> : data.map(item => <article className="clinic-record" key={item.id}>
        <div className="clinic-record-heading"><h4>{item.name}</h4><span className={`status ${item.isActive ? "accepted" : "neutral"}`}>{item.isActive ? "Published" : "Hidden"}</span></div>
        <p>{services ? `${item.category} · ${money(item.price)} · ${item.duration} min` : item.title}</p>
        <p className="muted">{services ? item.description : item.credentials}</p>
        <button className="button secondary" onClick={() => setEditing(item)} aria-label={`Edit ${item.name}`}>Edit {services ? "service" : "dentist"}</button>
      </article>)}
    </div>
    <EditorComponent key={`${editing?.id || "new"}-${version}`} item={editing} request={request} saved={message => { setEditing(null); setVersion(n => n + 1); saved(message); }} cancel={() => setEditing(null)} />
  </div>;
}
function Schedules({ data, request, saved }) {
  const activeDentists = data.dentists.filter(item => item.isActive);
  const [form, setForm] = useState({ dentistId: "", day: "1", start: "", end: "" });
  const [removing, setRemoving] = useState("");
  const [error, setError] = useState("");
  const change = event => setForm({ ...form, [event.target.name]: event.target.value });
  return <div className="clinic-tool-grid">
    <div className="clinic-records">
      <h3>Weekly working hours</h3>
      <p className="muted">Set recurring hours in Philippine time. These hours do not create appointment slots; online booking is not available yet.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {data.schedules.length === 0 ? <p className="clinic-empty">No working hours saved yet.</p> : data.schedules.map(item => {
        const dentist = data.dentists.find(d => d.id === item.dentistId);
        return <article className="clinic-record" key={item.id}>
          <h4>{dentist?.name || "Dentist unavailable"}{dentist && !dentist.isActive ? " (hidden)" : ""}</h4>
          <p>{days[item.day]} · {item.start}–{item.end}</p>
          <button className="button secondary" disabled={!!removing} aria-busy={removing === item.id} aria-label={`Remove ${days[item.day]} ${item.start} schedule for ${dentist?.name || "dentist"}`} onClick={async () => {
            setRemoving(item.id); setError("");
            try { await request(`/schedules/${item.id}`, "DELETE"); saved("Working hours removed. Existing appointments have not changed."); }
            catch (error) { setError(error.message); }
            finally { setRemoving(""); }
          }}>{removing === item.id ? "Removing…" : "Remove hours"}</button>
        </article>;
      })}
    </div>
    {activeDentists.length === 0 ? <div className="clinic-empty"><h3>Add a published dentist first</h3><p>Open Dentists and publish a dentist profile before adding working hours.</p></div> : <Editor title="Add working hours" submitLabel="Add working hours" request={body => request("/schedules", "POST", { ...body, day: Number(body.day) })} body={form} onSaved={() => { setForm({ ...form, start: "", end: "" }); saved("Working hours saved."); }}>
      <label className="field">Dentist<select aria-label="Dentist" name="dentistId" value={form.dentistId} onChange={change} required><option value="">Choose a dentist</option>{activeDentists.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <label className="field">Day of week<select aria-label="Day of week" name="day" value={form.day} onChange={change}>{days.map((day, i) => <option value={i} key={day}>{day}</option>)}</select></label>
      <Input label="Start time" name="start" type="time" value={form.start} onChange={change} required />
      <Input label="End time" name="end" type="time" value={form.end} onChange={change} required />
      <p className="summary-note">Use separate entries for split shifts. Hours for the same dentist cannot overlap.</p>
    </Editor>}
  </div>;
}
export function ClinicTools({ clinicId, owner, onUpdated }) {
  const [tab, setTab] = useState("profile");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [attempt, setAttempt] = useState(0);
  const base = "/workspaces/clinic/manage";
  const query = owner ? `?clinicId=${encodeURIComponent(clinicId)}` : "";
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    api(`${base}${query}`, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) { setData(result); onUpdated(result); } })
      .catch(error => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, attempt]);
  const request = (path, method, body) => api(`${base}${path}${query}`, { method, body });
  const saved = message => { setNotice(message); setAttempt(n => n + 1); };
  return <section className="panel clinic-tools" aria-label="Clinic setup tools">
    <h2>Manage your clinic</h2>
    <p className="muted">Keep your public profile, services, and team up to date.</p>
    <div className="clinic-tool-nav" aria-label="Clinic tools">{[["profile", "Clinic profile"], ["services", "Services & prices"], ["dentists", "Dentists"], ["schedules", "Working hours"]].map(([id, label]) => <button key={id} className={`button ${tab === id ? "" : "secondary"}`} aria-pressed={tab === id} onClick={() => { setTab(id); setNotice(""); }}>{label}</button>)}</div>
    {notice && <p className="notice" role="status">{notice}</p>}
    {loading ? <p role="status">Loading clinic tools…</p> : error ? <div role="alert"><p>{error}</p><button className="button secondary" onClick={() => setAttempt(n => n + 1)}>Reload clinic tools</button></div> : data && <>
      {tab === "profile" && <Profile key={attempt} clinic={data.clinic} request={request} saved={saved} />}
      {(tab === "services" || tab === "dentists") && <Catalog key={tab} type={tab} data={data[tab]} request={request} saved={saved} />}
      {tab === "schedules" && <Schedules data={data} request={request} saved={saved} />}
    </>}
  </section>;
}
