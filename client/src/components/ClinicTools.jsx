import Notifications, {useNotificationCount} from './Notifications';
import Concerns from './Concerns';
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Building2, CalendarDays, CheckCircle2, ChevronDown, CreditCard, ClipboardList, Clock3, ExternalLink, LayoutDashboard, MapPin, Menu, Pencil, Plus, RefreshCw, Search, Stethoscope, Tags, UsersRound } from "lucide-react";
import ClinicChangePolicy from "./ClinicChangePolicy";
import ClinicInbox from "./ClinicInbox";
import ClinicPayments from "./ClinicPayments";
import ClinicStaff from './ClinicStaff';
import ClinicIntakeSettings from './ClinicIntakeSettings';
import WorkingHoursEditor from './WorkingHoursEditor';
import { ClinicDrawer, ClinicEmpty, ClinicStatus } from "./ClinicUi";
import { api } from "../api";

const categories = ["Preventive", "Restorative", "Cosmetic", "Surgical", "Orthodontic", "General"];
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const money = value => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);
const initials = name => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
const sections = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, description: "A clear view of your clinic and what needs attention." },
  { id: "appointments", label: "Appointment inbox", title: "Appointments", icon: CalendarDays, description: "Review patient requests and keep your clinic’s visits organized." },
  {id:"notifications",label:"Notifications",icon:ClipboardList,description:"New concerns, patient replies, and concern updates."},
  {id:"concerns",label:"Patient concerns",icon:ClipboardList,description:"Accommodate patients and reply to their check-up concerns."},
  { id: "payments", label: "Deposits & payments", icon: CreditCard, description: "Set deposit terms and review verified payment records." },
  { id: "policies", label: "Appointment policies", icon: ClipboardList, description: "Set patient cancellation and rescheduling rules." },
  { id: "services", label: "Services & prices", icon: Tags, description: "Manage your treatments, estimated prices, and appointment durations." },
  { id: "dentists", label: "Dentists", icon: Stethoscope, description: "Manage your team’s profiles and the treatments each dentist provides." },
  { id: "schedules", label: "Working hours", icon: Clock3, description: "Set the weekly hours patients can request with your dentists." },
  { id: "profile", label: "Clinic profile", icon: Building2, description: "Keep the details on your public clinic listing up to date." },
  { id: 'intake', label: 'Patient intake', icon: ClipboardList, description: 'Configure your clinic’s private intake questions and information policy.' },
  { id: 'staff', label: 'Staff access', icon: UsersRound, description: 'Invite your team and control their clinic access.' },
];
function Input({ label, multiline, ...props }) {
  return <label className="field">{label}{multiline ? <textarea aria-label={label} rows={3} {...props} /> : <input {...props} />}</label>;
}
function Published({ checked, onChange, noun }) {
  return <label className="clinic-check clinic-publish-control"><input type="checkbox" checked={checked} onChange={onChange} /><span><strong>Publish this {noun} on the clinic profile</strong><small>Patients can see published information. Hidden records keep their saved details.</small></span></label>;
}
function Editor({ title, submitLabel, request, body, onSaved, children, onCancel, onBusyChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(""); onBusyChange?.(true);
    try { await request(body); onSaved(); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); onBusyChange?.(false); }
  }
  return <form className="clinic-editor" onSubmit={submit}>
    <h3 className="clinic-editor-title">{title}</h3>
    <fieldset disabled={busy}>
      {children}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="clinic-editor-actions">
        {onCancel && <button type="button" className="button secondary" onClick={onCancel}>Cancel editing</button>}
        <button className="button" disabled={busy} aria-busy={busy}>{busy ? "Saving…" : submitLabel}</button>
      </div>
    </fieldset>
  </form>;
}
function Profile({ clinic, request, saved }) {
  const [form, setForm] = useState({ name: clinic.name, description: clinic.description || "", address: clinic.address, phone: clinic.phone, email: clinic.email });
  const change = event => setForm({ ...form, [event.target.name]: event.target.value });
  return <div className="clinic-profile-layout"><div className="clinic-surface">
    <Editor title="Edit clinic profile" submitLabel="Save clinic profile" request={body => request("/profile", "PUT", body)} body={form} onSaved={() => saved("Clinic profile saved. Your public listing has been updated.")}>
      <div className="clinic-form-section"><h4>Clinic information</h4><p>Your name and description help patients recognize your clinic.</p>
        <Input label="Clinic name" name="name" value={form.name} onChange={change} required maxLength={200} />
        <Input label="About your clinic" name="description" value={form.description} onChange={change} multiline maxLength={5000} />
      </div>
      <div className="clinic-form-section"><h4>Location & contact</h4><p>Use the contact details you want patients to see.</p>
        <Input label="Clinic address" name="address" value={form.address} onChange={change} multiline required maxLength={1000} />
        <div className="clinic-form-row"><Input label="Public phone number" name="phone" type="tel" value={form.phone} onChange={change} required maxLength={30} />
          <Input label="Public email address" name="email" type="email" value={form.email} onChange={change} required maxLength={254} /></div>
      </div>
    </Editor>
  </div><aside className="clinic-surface clinic-profile-note"><span className="clinic-note-icon"><Building2 size={22} /></span><h3>Your public listing</h3><p>Saved changes appear on your clinic’s public profile. Your account sign-in email stays separate.</p>
    <Link className="clinic-inline-link" to={`/clinics/${clinic.id}`}>View public clinic profile <ExternalLink size={16} /></Link>
  </aside></div>;
}
function ServiceEditor({ item, request, saved, cancel, onBusyChange }) {
  const [form, setForm] = useState(item ? { ...item, price: String(item.price), description: item.description || "" } : { name: "", category: "General", description: "", price: "", duration: 30, isActive: true });
  const change = event => setForm({ ...form, [event.target.name]: event.target.value });
  return <Editor title={item ? "Edit service" : "Add a service"} submitLabel={item ? "Save service" : "Add service"} request={body => request(`/services${item ? `/${item.id}` : ""}`, item ? "PUT" : "POST", { ...body, duration: Number(body.duration) })} body={form} onSaved={() => saved("Service saved. Published services appear in your listing and cost calculator.")} onCancel={cancel} onBusyChange={onBusyChange}>
    <Input label="Service name" name="name" value={form.name} onChange={change} required maxLength={200} />
    <label className="field">Service category<select aria-label="Service category" name="category" value={form.category} onChange={change}>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
    <Input label="Service description" name="description" value={form.description} onChange={change} multiline maxLength={3000} />
    <div className="clinic-form-row"><Input label="Estimated price (PHP)" name="price" type="number" inputMode="decimal" min="0" max="99999999.99" step="0.01" value={form.price} onChange={change} required />
      <Input label="Duration (minutes)" name="duration" type="number" inputMode="numeric" min="5" max="480" step="1" value={form.duration} onChange={change} required /></div>
    <Published noun="service" checked={form.isActive} onChange={event => setForm({ ...form, isActive: event.target.checked })} />
  </Editor>;
}
function DentistEditor({ item, request, saved, cancel, services, assignments, onBusyChange }) {
  const [form, setForm] = useState(item ? { ...item, credentials: item.credentials || "", serviceIds: assignments.filter(assignment => assignment.dentistId === item.id).map(assignment => assignment.serviceId) } : { name: "", title: "", credentials: "", isActive: true, serviceIds: [] });
  const change = event => setForm({ ...form, [event.target.name]: event.target.value });
  return <Editor title={item ? "Edit dentist" : "Add a dentist"} submitLabel={item ? "Save dentist" : "Add dentist"} request={body => request(`/dentists${item ? `/${item.id}` : ""}`, item ? "PUT" : "POST", body)} body={form} onSaved={() => saved("Dentist saved. Published dentists appear on your public profile.")} onCancel={cancel} onBusyChange={onBusyChange}>
    <Input label="Dentist name" name="name" value={form.name} onChange={change} required maxLength={150} />
    <Input label="Professional title" name="title" value={form.title} onChange={change} required maxLength={100} />
    <Input label="Credentials and qualifications" name="credentials" value={form.credentials} onChange={change} multiline maxLength={3000} />
    <p className="clinic-field-help">Use accurate qualifications. A dentist profile does not create a staff sign-in account.</p>
    <fieldset className="clinic-assignment-list"><legend>Treatments this dentist provides</legend>
      <p>Choose treatments to enable booking with this dentist.</p>
      {services.length === 0 ? <p>Add services under Services &amp; prices first.</p> : services.map(service => <label className="clinic-check" key={service.id}>
        <input type="checkbox" checked={form.serviceIds.includes(service.id)} onChange={event => setForm(previous => ({ ...previous, serviceIds: event.target.checked ? [...previous.serviceIds, service.id] : previous.serviceIds.filter(id => id !== service.id) }))} />{service.name}{!service.isActive ? " (hidden)" : ""}
      </label>)}
    </fieldset>
    <Published noun="dentist" checked={form.isActive} onChange={event => setForm({ ...form, isActive: event.target.checked })} />
  </Editor>;
}
function Catalog({ type, data, request, saved, services, assignments }) {
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const [publication, setPublication] = useState("all");
  const [busy, setBusy] = useState(false);
  const isService = type === "services", noun = isService ? "service" : "dentist";
  const EditorComponent = isService ? ServiceEditor : DentistEditor;
  const results = data.filter(item => `${item.name} ${item.category || item.title} ${item.description || item.credentials || ""}`.toLowerCase().includes(query.trim().toLowerCase()) && (publication === "all" || item.isActive === (publication === "published")));
  return <section className="clinic-surface clinic-catalog" aria-label={isService ? "Service catalog" : "Dentist directory"}>
    <div className="clinic-toolbar"><label className="clinic-search"><Search size={18} /><input aria-label={`Search ${type}`} placeholder={isService ? "Search services…" : "Search dentists…"} value={query} onChange={event => setQuery(event.target.value)} /></label>
      <label className="clinic-filter"><span className="sr-only">Publication status</span><select aria-label="Publication status" value={publication} onChange={event => setPublication(event.target.value)}><option value="all">All statuses</option><option value="published">Published</option><option value="hidden">Hidden</option></select></label>
      <button className="button" onClick={() => setEditing("new")}><Plus size={17} />Add a {noun}</button>
    </div>
    {results.length === 0 ? <ClinicEmpty icon={data.length ? Search : isService ? Tags : UsersRound} title={data.length ? `No matching ${type}` : `No ${type} yet`} action={data.length ? <button className="button secondary" onClick={() => { setQuery(""); setPublication("all"); }}>Clear filters</button> : null}>{data.length ? "Try a different search or publication status." : `Add your first ${noun} to build your clinic’s ${isService ? "treatment catalog" : "team"}.`}</ClinicEmpty> : <div className="clinic-table-region" role="region" aria-label={isService ? "Saved services" : "Saved dentists"} tabIndex={0}>
      <table className="clinic-table"><thead><tr><th>{isService ? "Service" : "Dentist"}</th><th>{isService ? "Category" : "Treatments"}</th>{isService && <><th>Est. price</th><th>Duration</th></>}<th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{results.map(item => {
          const count = assignments.filter(assignment => assignment.dentistId === item.id).length;
          return <tr key={item.id}>
            <td className="clinic-table-name"><div className="clinic-record-identity">{!isService && <span className="clinic-avatar" aria-hidden="true">{initials(item.name)}</span>}<div><h3>{item.name}</h3><p>{isService ? item.description || "No description added" : item.title}</p></div></div></td>
            <td data-label={isService ? "Category" : "Treatments"}>{isService ? item.category : <span className={!count ? "clinic-needs-attention" : ""}>{count ? `${count} assigned` : "No treatments assigned"}</span>}</td>
            {isService && <><td data-label="Est. price" className="clinic-price">{money(item.price)}</td><td data-label="Duration">{item.duration} min</td></>}
            <td><ClinicStatus status={item.isActive ? "published" : "hidden"}>{item.isActive ? "Published" : "Hidden"}</ClinicStatus></td>
            <td className="clinic-table-actions"><button className="clinic-row-button" aria-label={`Edit ${item.name}`} onClick={() => setEditing(item)}><Pencil size={15} />Edit {noun}</button></td>
          </tr>;
        })}</tbody>
      </table>
    </div>}
    <footer className="clinic-list-footer">{results.length} of {data.length} {type}</footer>
    {editing && <ClinicDrawer title={editing === "new" ? `Add a ${noun}` : `Edit ${noun}`} busy={busy} onClose={() => setEditing(null)}>
      <EditorComponent item={editing === "new" ? null : editing} services={services} assignments={assignments} request={request} onBusyChange={setBusy} saved={message => { setEditing(null); saved(message); }} cancel={() => setEditing(null)} />
    </ClinicDrawer>}
  </section>;
}
function Schedules({ data, request, saved, navigate }) {
  const [adding, setAdding] = useState(false), [busy, setBusy] = useState(false), [removing, setRemoving] = useState(""), [error, setError] = useState("");
  const [dentistId, setDentistId] = useState("");
  const [editing,setEditing]=useState(null);
  const active = data.dentists.filter(item => item.isActive);
  const shown = data.schedules.filter(item => !dentistId || item.dentistId === dentistId);
  return <section className="clinic-surface">
    <div className="clinic-toolbar"><div className="clinic-toolbar-copy"><h2>Weekly schedule</h2><p>Recurring hours · Philippine time</p></div>
      <select className="clinic-schedule-filter" aria-label="Filter schedules by dentist" value={dentistId} onChange={event => setDentistId(event.target.value)}><option value="">All dentists</option>{data.dentists.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
      <button className="button" disabled={!active.length} onClick={() => setAdding(true)}><Plus size={17} />Add working hours</button>
    </div>
    {error && <p className="clinic-feedback error" role="alert">{error}</p>}
    {!active.length ? <ClinicEmpty icon={Stethoscope} title="Add a published dentist first" action={<button className="button secondary" onClick={() => navigate("dentists")}>Manage dentists</button>}>Publish a dentist profile before setting working hours.</ClinicEmpty> : !shown.length ? <ClinicEmpty icon={Clock3} title="No working hours saved yet.">Add your dentist’s recurring hours to make appointment times available.</ClinicEmpty> : <div className="clinic-week">
      {days.map((day, index) => {
        const shifts = shown.filter(item => item.day === index);
        if (!shifts.length) return null;
        return <section className="clinic-week-day" key={day}><h3>{day}<small>{shifts.length} {shifts.length === 1 ? "shift" : "shifts"}</small></h3><div>{shifts.map(item => {
          const dentist = data.dentists.find(person => person.id === item.dentistId);
          return <article className="clinic-shift" key={item.id}><span className="clinic-shift-icon"><Clock3 size={18} /></span><div><h4>{dentist?.name || "Dentist unavailable"}{dentist && !dentist.isActive ? " (hidden)" : ""}</h4><p>{day} · {item.start}–{item.end}</p></div>
            <button className="clinic-row-button" disabled={!!removing || !dentist?.isActive} aria-label={`Edit ${day} ${item.start} schedule for ${dentist?.name || 'dentist'}`} onClick={()=>setEditing(item)}><Pencil size={15} />Edit hours</button>
            <button className="clinic-row-button" disabled={!!removing} aria-busy={removing === item.id} aria-label={`Remove ${day} ${item.start} schedule for ${dentist?.name || "dentist"}`} onClick={async () => {
              setRemoving(item.id); setError("");
              try { await request(`/schedules/${item.id}`, "DELETE"); saved("Working hours removed. Existing appointments have not changed."); }
              catch (error) { setError(error.message); }
              finally { setRemoving(""); }
            }}>{removing === item.id ? "Removing…" : "Remove hours"}</button>
          </article>;
        })}</div></section>;
      })}
    </div>}
    <div className="clinic-surface-note"><CheckCircle2 size={16} /><p>Hours control new requests. Existing appointments keep their saved visit times when you change this schedule.</p></div>
    {(adding || editing) && <ClinicDrawer title={editing ? 'Edit working hours' : 'Add working hours'} busy={busy} onClose={()=>{setAdding(false);setEditing(null);}}><WorkingHoursEditor dentists={active} schedules={data.schedules} initialDentistId={dentistId} item={editing} request={request} onBusyChange={setBusy} saved={message=>{setAdding(false);setEditing(null);saved(message);}} cancel={()=>{setAdding(false);setEditing(null);}} /></ClinicDrawer>}
  </section>;
}
function Overview({ data, counts, navigate }) {
  const services = data.services.filter(item => item.isActive), dentists = data.dentists.filter(item => item.isActive);
  const assignments = (data.assignments || []).filter(item => services.some(service => service.id === item.serviceId) && dentists.some(dentist => dentist.id === item.dentistId));
  const hoursFit = data.schedules.some(shift => assignments.some(assignment => assignment.dentistId === shift.dentistId && services.some(service => service.id === assignment.serviceId && service.duration <= (Number(shift.end.slice(0,2)) * 60 + Number(shift.end.slice(3))) - (Number(shift.start.slice(0,2)) * 60 + Number(shift.start.slice(3))))));
  const steps = [
    { label: "Publish your services", done: services.length > 0, section: "services", action: "Manage services" },
    { label: "Publish your dentist profiles", done: dentists.length > 0, section: "dentists", action: "Manage dentists" },
    { label: "Assign treatments to dentists", done: assignments.length > 0, section: "dentists", action: "Assign treatments" },
    { label: "Set bookable working hours", done: hoursFit, section: "schedules", action: "Set working hours" },
  ];
  const complete = steps.filter(item => item.done).length;
  const pending = data.pendingAppointments ?? counts.pendingAppointments;
  return <>
    <div className="clinic-metrics">{[
      { label: "Awaiting review", value: pending, section: "appointments", icon: CalendarDays, detail: "Open appointment inbox" },
      { label: "Published services", value: services.length, section: "services", icon: Tags, detail: "Manage services" },
      { label: "Published dentists", value: dentists.length, section: "dentists", icon: UsersRound, detail: "Manage dentists" },
    ].map(({ label, value, section, icon: Icon, detail }) => <button className="clinic-metric" key={label} onClick={() => navigate(section)} aria-label={detail}><span>{label}<Icon size={18} /></span><strong>{value}</strong><small>{detail} <ArrowRight size={13} /></small></button>)}</div>
    <div className="clinic-overview-grid"><section className="clinic-surface clinic-requests-summary"><div className="clinic-section-heading"><span className="clinic-note-icon"><ClipboardList size={21} /></span><ClinicStatus status={pending ? "pending_review" : "published"}>{pending ? "Needs attention" : "Up to date"}</ClinicStatus></div>
      <h2>{pending ? `${pending} ${pending === 1 ? "request is" : "requests are"} waiting for review` : "Your appointment inbox is clear"}</h2>
      <p>{pending ? "Review the patient’s details and requested time, then accept or decline the request." : "New patient requests will appear in your inbox. You can also view previously reviewed requests there."}</p>
      <button className="button" onClick={() => navigate("appointments")}>Open appointment inbox <ArrowRight size={16} /></button>
      <div className="clinic-summary-footnote"><Clock3 size={15} />Pending requests hold the dentist’s time until reviewed.</div>
    </section><section className="clinic-surface clinic-booking-setup"><div className="clinic-section-heading"><div><h2>Booking setup</h2><p>{complete === steps.length ? "Your booking setup is complete." : "Complete these steps so patients can request a visit."}</p></div><span className="clinic-setup-count">{complete}/{steps.length}</span></div>
      <ol>{steps.map(step => <li key={step.label}><span className={step.done ? "clinic-step-complete" : "clinic-step-pending"}>{step.done ? <CheckCircle2 size={19} /> : <span className="clinic-step-dot" />}</span><span>{step.label}</span><button className="clinic-icon-button" aria-label={step.action} onClick={() => navigate(step.section)}><ArrowRight size={17} /></button></li>)}</ol>
    </section></div>
    <section className="clinic-surface clinic-contact-summary"><div className="clinic-section-heading"><div><h2>Clinic contact information</h2><p>Visible on your public profile.</p></div><button className="clinic-row-button" onClick={() => navigate("profile")}><Pencil size={15} />Edit profile</button></div>
      <dl><div><dt>Address</dt><dd><MapPin size={16} />{data.clinic.address}</dd></div><div><dt>Phone</dt><dd>{data.clinic.phone}</dd></div><div><dt>Email</dt><dd>{data.clinic.email}</dd></div></dl>
    </section>
  </>;
}
export function ClinicTools({ clinicId, owner, clinic, counts, user, clinicPicker, signOut, onUpdated }) {
  const [params, setParams] = useSearchParams();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [data, setData] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [attempt, setAttempt] = useState(0), [version, setVersion] = useState(0);
  const notificationCount=useNotificationCount({staff:true,clinicId,owner});
  const staffRole=data?.clinic.staffRole || clinic.staffRole || 'owner';
  const allowedSections=sections.filter(item=>staffRole==='dentist' ? ['appointments','concerns','notifications'].includes(item.id) : staffRole==='appointments' ? ['appointments','schedules','concerns','notifications'].includes(item.id) : item.id!=='staff' || staffRole==='owner');
  const section=allowedSections.find(item=>item.id===params.get('section')) || allowedSections[0];
  const heading = useRef(null);
  const base = "/workspaces/clinic/manage", query = owner ? `?clinicId=${encodeURIComponent(clinicId)}` : "";
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    api(`${base}${query}`, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) { setData(result); setVersion(value => value + 1); onUpdated(result); } })
      .catch(error => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, attempt]);
  useEffect(() => { setNavigationOpen(false); window.scrollTo(0,0); heading.current?.focus({ preventScroll: true }); }, [section.id]);
  function navigate(id) { setNavigationOpen(false); const next = new URLSearchParams(params); next.set("section", id); setParams(next); setNotice(""); }
  const request = (path, method, body) => api(`${base}${path}${path.includes("?") ? query.replace("?", "&") : query}`, { method, body });
  const saved = message => { setNotice(message); setAttempt(value => value + 1); };
  const pending = data?.pendingAppointments ?? counts.pendingAppointments;
  const current = data?.clinic || clinic;
  return <div className="clinic-app">
    <aside className={`clinic-sidebar ${navigationOpen ? "is-open" : ""}`}>
      <div className="clinic-sidebar-identity"><span className="clinic-avatar clinic-avatar-clinic" aria-hidden="true"><Building2 size={23} /></span><div><h2>{current.name}</h2><span className="clinic-sidebar-status"><i />Approved clinic</span></div></div>
      {clinicPicker}
      <button className="clinic-mobile-menu" aria-label={navigationOpen ? "Close clinic navigation" : "Open clinic navigation"} aria-expanded={navigationOpen} aria-controls="clinic-navigation" onClick={() => setNavigationOpen(value => !value)}><Menu size={19} /><span>{section.label}</span><ChevronDown size={17} /></button>
      <nav id="clinic-navigation" className="clinic-navigation" aria-label="Clinic workspace"><p className="clinic-nav-caption">WORKSPACE</p>{allowedSections.map(({ id, label, icon: Icon }, index) => <div key={id}>{index === 3 && <p className="clinic-nav-caption">CLINIC SETUP</p>}<button className={`clinic-nav-link ${section.id === id ? "is-active" : ""}`} aria-current={section.id === id ? "page" : undefined} aria-label={label} onClick={() => navigate(id)}><Icon size={19} /><span>{id === "appointments" ? "Appointments" : label}</span>{id === "notifications" && notificationCount>0 && <b aria-label={`${notificationCount} unread`}>{notificationCount>99?'99+':notificationCount}</b>}{id === "appointments" && pending > 0 && <b aria-hidden="true">{pending}</b>}</button></div>)}</nav>
      <div className="clinic-sidebar-footer"><div className="clinic-account"><span className="clinic-avatar" aria-hidden="true">{initials(user.name)}</span><div><strong>{user.name}</strong><small>{owner ? "Owner access" : staffRole==='dentist' ? "Dentist · assigned visits" : "Clinic staff"}</small></div></div>{signOut}</div>
    </aside>
    <div className="clinic-content"><header className="clinic-page-header"><div><p className="clinic-breadcrumb">Clinic workspace <span>/</span> {section.title || section.label}</p><h1 ref={heading} tabIndex={-1}>{section.title || section.label}</h1><p>{section.description}</p></div><div className="clinic-header-actions">
      <div className="clinic-mobile-signout">{signOut}</div><button className="clinic-icon-button" aria-label="Refresh workspace" disabled={loading} aria-busy={loading} onClick={() => setAttempt(value => value + 1)}><RefreshCw size={18} /></button>
      <Link className="button secondary" to={`/clinics/${current.id}`} aria-label="View public clinic profile"><ExternalLink size={16} /><span>Public profile</span></Link>
    </div></header>
      {notice && <div className="clinic-feedback" role="status"><CheckCircle2 size={18} />{notice}</div>}
      {loading && !data ? <div className="clinic-surface clinic-loading" role="status">Loading your clinic workspace…</div> : error ? <div className="clinic-surface clinic-loading" role="alert"><h2>We couldn’t load this workspace.</h2><p>{error}</p><button className="button secondary" onClick={() => setAttempt(value => value + 1)}>Reload clinic tools</button></div> : data && <>
        {section.id === "notifications" && <Notifications key={clinicId} staff clinicId={clinicId} owner={owner} />}
        {section.id === "concerns" && <Concerns key={clinicId} staff clinicId={clinicId} owner={owner} />}
        {section.id === "overview" && <Overview data={data} counts={counts} navigate={navigate} />}
        {section.id === "payments" && data.clinic.id === clinicId && <ClinicPayments key={`${clinicId}:${version}`} data={data} request={request} saved={saved} receiptBase={id => `${base}/payments/${id}/receipt${query}`} />}
        {section.id === "policies" && <ClinicChangePolicy key={`${clinicId}:${version}`} clinic={data.clinic} request={request} saved={saved} />}
        {section.id === "profile" && <Profile key={version} clinic={data.clinic} request={request} saved={saved} />}
        {section.id === 'staff' && <ClinicStaff key={clinicId} request={request} dentists={data.dentists} />}
        {section.id === 'intake' && <ClinicIntakeSettings key={clinicId} request={request} services={data.services} />}
        {(section.id === "services" || section.id === "dentists") && <Catalog key={section.id} type={section.id} data={data[section.id]} services={data.services} assignments={data.assignments || []} request={request} saved={saved} />}
        {section.id === "schedules" && <Schedules data={data} request={request} saved={saved} navigate={navigate} />}
        {section.id === "appointments" && <ClinicInbox dentist={staffRole==='dentist'} request={request} onReviewed={pendingAppointments => { setData(previous => ({ ...previous, pendingAppointments })); onUpdated({ ...data, pendingAppointments }); }} />}
      </>}
      <footer className="clinic-content-footer">DentaBook clinic workspace <span>All appointment times use Philippine time (UTC+8).</span></footer>
    </div>
  </div>;
}
