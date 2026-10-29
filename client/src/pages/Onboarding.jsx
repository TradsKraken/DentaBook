import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { api } from "../api";
import { PageTitle } from "../components/Shared";
import { useAuth } from "../hooks/useAuth";
import { useClinics } from "../hooks/useClinics";
import { patientDestination } from "../patientNavigation";

export function Field({ label, name, value, onChange, error, ...props }) {
  return (
    <label className="field">
      {label}
      <input
        name={name}
        value={value}
        onChange={onChange}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        required
        {...props}
      />
      {error && (
        <span className="field-error" id={`${name}-error`}>
          {error}
        </span>
      )}
    </label>
  );
}
const blank = {
  ownerName: "",
  email: "",
  password: "",
  confirmPassword: "",
  clinicName: "",
  address: "",
  phone: "",
  contactEmail: "",
  registrationReference: "",
  consent: false,
};
export function Registration() {
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState({});
  const [receipt, setReceipt] = useState(null);
  const change = (event) => {
    const { name, value, checked, type } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };
  async function submit(event) {
    event.preventDefault();
    setError("");
    setFields({});
    if (form.password !== form.confirmPassword) {
      setFields({ confirmPassword: "The passwords do not match." });
      return;
    }
    setBusy(true);
    try {
      const { confirmPassword, ...body } = form;
      const data = await api("/auth/register-clinic", { method: "POST", body });
      setReceipt(data);
      setForm(blank);
    } catch (error) {
      setError(error.message);
      setFields(error.fields || {});
    } finally {
      setBusy(false);
    }
  }
  if (receipt)
    return (
      <div className="wrap page">
        <section className="panel success-panel">
          <span className="success-icon">
            <CheckCircle2 size={40} />
          </span>
          <p className="eyebrow">REGISTRATION RECEIVED</p>
          <h1>Your clinic is awaiting review.</h1>
          <p className="muted">
            A system administrator will review the information you submitted.
            Your clinic will appear in the directory only after approval.
          </p>
          <p className="notice">
            Sign in to check your registration status. Dashboard access becomes
            available after approval.
          </p>
          <Link className="button" to="/clinic/sign-in">
            Sign in to your account <ArrowRight size={17} />
          </Link>
        </section>
      </div>
    );
  return (
    <div className="wrap page">
      <PageTitle
        eyebrow="JOIN DENTABOOK"
        title="Bring your clinic to more smiles."
        text="Register your clinic for administrator review. Your information is saved securely to your clinic account."
      />
      <div className="two-column">
        <form className="panel" onSubmit={submit}>
          <h2>Your clinic account</h2>
          <p className="muted">
            These details are for the person authorized to manage the clinic.
          </p>
          <Field
            label="Account holder’s full name"
            name="ownerName"
            value={form.ownerName}
            onChange={change}
            error={fields.ownerName}
            maxLength={150}
            autoComplete="name"
          />
          <Field
            label="Account email address"
            name="email"
            value={form.email}
            onChange={change}
            error={fields.email}
            type="email"
            maxLength={254}
            autoComplete="email"
          />
          <Field
            label="Password"
            name="password"
            value={form.password}
            onChange={change}
            error={fields.password}
            type="password"
            minLength={12}
            maxLength={72}
            autoComplete="new-password"
          />
          <p className="field-hint">
            Use at least 12 characters. Passwords can contain up to 72 UTF-8
            bytes.
          </p>
          <Field
            label="Confirm password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={change}
            error={fields.confirmPassword}
            type="password"
            minLength={12}
            maxLength={72}
            autoComplete="new-password"
          />
          <h2>Clinic information</h2>
          <p className="muted">
            Clinic contact information will be public after approval. Your
            registration reference is for administrator review.
          </p>
          <Field
            label="Clinic name"
            name="clinicName"
            value={form.clinicName}
            onChange={change}
            error={fields.clinicName}
            maxLength={200}
            autoComplete="organization"
          />
          <Field
            label="Clinic address"
            name="address"
            value={form.address}
            onChange={change}
            error={fields.address}
            maxLength={1000}
            autoComplete="street-address"
          />
          <Field
            label="Public clinic phone number"
            name="phone"
            value={form.phone}
            onChange={change}
            error={fields.phone}
            type="tel"
            maxLength={30}
            autoComplete="tel"
          />
          <Field
            label="Public clinic email address"
            name="contactEmail"
            value={form.contactEmail}
            onChange={change}
            error={fields.contactEmail}
            type="email"
            maxLength={254}
          />
          <Field
            label="Clinic registration or license reference"
            name="registrationReference"
            value={form.registrationReference}
            onChange={change}
            error={fields.registrationReference}
            maxLength={200}
          />
          <label className="consent">
            <input
              type="checkbox"
              name="consent"
              checked={form.consent}
              onChange={change}
              required
            />
            I am authorized to register and manage this clinic, and the
            information provided is accurate.
          </label>
          {fields.consent && <p className="field-error">{fields.consent}</p>}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button className="button" disabled={busy} aria-busy={busy}>
              {busy ? "Submitting registration…" : "Submit for review"}
            </button>
          </div>
          <Link className="text-link" to="/clinic/sign-in">
            Already registered? Sign in <ArrowRight size={16} />
          </Link>
        </form>
        <aside className="panel soft-panel">
          <span className="icon-tile">
            <ShieldCheck />
          </span>
          <h2>A thoughtful start for your clinic.</h2>
          <p className="muted">
            Submit your information, wait for administrator approval, then
            access your clinic dashboard.
          </p>
          <p className="summary-note">
            Submitting this form does not publish your clinic or give access to
            appointment records. You can check the review result by signing in.
          </p>
        </aside>
      </div>
    </div>
  );
}
export function SignIn({ portal = "clinic" }) {
  const patient = portal === "patient";
  const location = useLocation();
  const destination = patientDestination(
    new URLSearchParams(location.search).get("next"),
  );
  const administrator = portal === "admin";
  const expectedRole = administrator
    ? "system_admin"
    : patient
      ? "patient"
      : "clinic_staff";
  const signInPath = administrator
    ? "/admin/sign-in"
    : patient
      ? `/patient/sign-in?next=${encodeURIComponent(destination)}`
      : "/clinic/sign-in";
  const workspace = administrator
    ? "/admin"
    : patient
      ? destination
      : "/clinic";
  const { session, refresh } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (session && session.user.role !== expectedRole)
    return (
      <div className="wrap page">
        <div className="account-panel panel empty">
          <h1>This account belongs to another portal.</h1>
          <p>
            Sign out before signing in with{" "}
            {administrator
              ? "an administrator"
              : patient
                ? "a patient"
                : "a clinic"}{" "}
            account.
          </p>
          <SignOut destination={signInPath} />
        </div>
      </div>
    );
  if (session) return <Navigate to={workspace} replace />;
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(
        administrator
          ? "/auth/admin/login"
          : patient
            ? "/auth/patient/login"
            : "/auth/clinic/login",
        {
          method: "POST",
          body: form,
        },
      );
      const current = await refresh();
      if (!current || current.user.role !== expectedRole)
        throw new Error(
          "Please sign in using the correct portal for your account.",
        );
      navigate(workspace, {
        replace: true,
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="wrap page">
      <div className="account-panel">
        <PageTitle
          eyebrow={administrator ? "DENTABOOK ADMINISTRATION" : "WELCOME BACK"}
          title={
            administrator
              ? "Administrator sign-in."
              : patient
                ? "Sign in to continue."
                : "Sign in to your clinic."
          }
          text={
            administrator
              ? "For authorized platform administrators only."
              : patient
                ? "Explore freely. Sign in to access booking and your personal appointments."
                : "Manage your clinic and check your registration status."
          }
        />
        <form className="panel" onSubmit={submit}>
          <Field
            label="Email address"
            name="email"
            type="email"
            autoComplete="username"
            value={form.email}
            onChange={(event) =>
              setForm({ ...form, email: event.target.value })
            }
          />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(event) =>
              setForm({ ...form, password: event.target.value })
            }
          />
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button full" disabled={busy} aria-busy={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          {!administrator && (
            <Link
              className="text-link"
              to={
                patient
                  ? `/patient/register?next=${encodeURIComponent(destination)}`
                  : "/clinic/register"
              }
            >
              {patient ? "Create a patient account" : "Register your clinic"}{" "}
              <ArrowRight size={16} />
            </Link>
          )}
        </form>
      </div>
    </div>
  );
}
export function SignOut({ destination } = {}) {
  const { signOut, session } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <button
        className="button secondary"
        disabled={busy} aria-busy={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await signOut();
            navigate(
              destination ||
                (pathname.startsWith("/admin")
                  ? "/admin/sign-in"
                  : session?.user.role === "patient"
                    ? "/patient/sign-in"
                    : "/clinic/sign-in"),
              { replace: true },
            );
          } catch (error) {
            setError(error.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
export function ClinicWorkspace() {
  const { session, refresh } = useAuth();
  const { retry: refreshDirectory } = useClinics();
  const [workspace, setWorkspace] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const clinic = session.clinic;
  useEffect(() => {
    if (clinic?.status === "approved") refreshDirectory();
  }, [clinic?.status, refreshDirectory]);
  useEffect(() => {
    if (clinic?.status !== "approved") return;
    const controller = new AbortController();
    api("/workspaces/clinic", { signal: controller.signal })
      .then(setWorkspace)
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      });
    return () => controller.abort();
  }, [clinic?.status, attempt]);
  return (
    <div className="wrap page">
      <div className="section-heading">
        <PageTitle
          eyebrow="YOUR CLINIC ACCOUNT"
          title={clinic?.name || "Clinic registration"}
          text={`Signed in as ${session.user.name}`}
        />
        <SignOut />
      </div>
      {clinic?.status !== "approved" ? (
        <section className="panel account-status">
          <span className="icon-tile">
            <Clock3 />
          </span>
          <h2>
            {clinic?.status === "rejected"
              ? "Your registration was not approved."
              : clinic?.status === "suspended"
                ? "Your clinic access is suspended."
                : "Your clinic is awaiting review."}
          </h2>
          <p className="muted">
            {clinic?.status === "pending_review"
              ? "An administrator needs to approve your clinic before you can open the dashboard or appear in the public directory."
              : "Dashboard access is unavailable. Review the information below."}
          </p>
          {clinic?.reviewNotes && (
            <div className="notice">
              <strong>Administrator’s note: </strong>
              {clinic.reviewNotes}
            </div>
          )}
          <button
            className="button secondary"
            onClick={() => refresh().catch(() => {})}
          >
            Refresh registration status
          </button>
        </section>
      ) : error ? (
        <div className="panel empty" role="alert">
          <h2>We couldn’t open your dashboard.</h2>
          <p>{error}</p>
          <button
            className="button secondary"
            onClick={() => {
              setError("");
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </button>
          <button
            className="text-link"
            onClick={() => refresh().catch(() => {})}
          >
            Refresh account status
          </button>
        </div>
      ) : !workspace ? (
        <p role="status">Loading your clinic dashboard…</p>
      ) : (
        <>
          <div className="notice">
            <CheckCircle2 size={20} />
            Your clinic is approved and listed in the public directory.
          </div>
          <div className="stats-grid">
            {[
              ["Dentists", workspace.counts.dentists],
              ["Published services", workspace.counts.services],
              ["Pending appointments", workspace.counts.pendingAppointments],
            ].map(([name, count]) => (
              <div className="panel stat" key={name}>
                <Stethoscope size={22} />
                <strong>{count}</strong>
                <span>{name}</span>
              </div>
            ))}
          </div>
          <section className="panel">
            <h2>Clinic contact information</h2>
            <dl className="review-details">
              <dt>Address</dt>
              <dd>{workspace.clinic.address}</dd>
              <dt>Phone</dt>
              <dd>{workspace.clinic.phone}</dd>
              <dt>Email</dt>
              <dd>{workspace.clinic.email}</dd>
            </dl>
            <Link className="button secondary" to={`/clinics/${clinic.id}`}>
              View public clinic profile <ArrowRight size={16} />
            </Link>
            <p className="summary-note">
              Clinic profile editing, dentist/service management, schedules, and
              booking tools are the next development stage.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
export function AdminWorkspace() {
  const { retry: refreshDirectory } = useClinics();
  const [status, setStatus] = useState("pending_review");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [review, setReview] = useState(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api(`/workspaces/admin/clinics?status=${status}`, {
      signal: controller.signal,
    })
      .then((data) => setRows(data.clinics))
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [status, attempt]);
  async function submitReview(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/workspaces/admin/clinics/${review.id}/review`, {
        method: "POST",
        body: { decision: review.decision, notes },
      });
      setNotice(
        `${review.name} ${review.decision === "approved" ? "approved" : "rejected"}.`,
      );
      setReview(null);
      setNotes("");
      setAttempt((n) => n + 1);
      refreshDirectory();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="wrap page">
      <div className="section-heading">
        <PageTitle
          eyebrow="PLATFORM ADMINISTRATION"
          title="Review clinic registrations."
          text="Check each clinic’s information before making it available to patients."
        />
        <SignOut />
      </div>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <label className="field admin-filter">
        Registration status
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setReview(null);
            setError("");
          }}
        >
          {[
            ["pending_review", "Awaiting review"],
            ["approved", "Approved"],
            ["rejected", "Rejected"],
            ["suspended", "Suspended"],
          ].map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {review ? (
        <form className="panel review-panel" onSubmit={submitReview}>
          <h2>
            {review.decision === "approved" ? "Approve" : "Reject"}{" "}
            {review.name}?
          </h2>
          <p className="muted">
            {review.decision === "approved"
              ? "Approval publishes this clinic and unlocks its dashboard."
              : "The clinic will remain unpublished and dashboard access will stay blocked."}
          </p>
          <label className="field">
            Review notes
            {review.decision === "rejected" ? " (required)" : " (optional)"}
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={2000}
              required={review.decision === "rejected"}
              rows={4}
            />
          </label>
          <div className="form-actions">
            <button
              className="button secondary"
              type="button"
              disabled={busy} aria-busy={busy}
              onClick={() => {
                setReview(null);
                setError("");
              }}
            >
              Cancel
            </button>
            <button className="button" disabled={busy} aria-busy={busy}>
              {busy ? "Saving decision…" : "Confirm decision"}
            </button>
          </div>
        </form>
      ) : loading ? (
        <p role="status">Loading registrations…</p>
      ) : error ? (
        <button
          className="button secondary"
          onClick={() => setAttempt((n) => n + 1)}
        >
          Try again
        </button>
      ) : !rows.length ? (
        <div className="panel empty">
          <ShieldCheck size={36} />
          <h2>No registrations in this category.</h2>
        </div>
      ) : (
        <div className="registration-list">
          {rows.map((clinic) => (
            <article className="panel" key={clinic.id}>
              <p className="eyebrow">{clinic.status.replaceAll("_", " ")}</p>
              <h2>{clinic.name}</h2>
              <dl className="review-details">
                <dt>Owner</dt>
                <dd>
                  {clinic.ownerName}
                  <br />
                  {clinic.ownerEmail}
                </dd>
                <dt>Address</dt>
                <dd>{clinic.address}</dd>
                <dt>Contact</dt>
                <dd>
                  {clinic.phone}
                  <br />
                  {clinic.email}
                </dd>
                <dt>Reference</dt>
                <dd>{clinic.registrationReference || "Not provided"}</dd>
                <dt>Submitted</dt>
                <dd>
                  {new Date(clinic.createdAt).toLocaleDateString("en-PH", {
                    dateStyle: "medium",
                  })}
                </dd>
              </dl>
              {clinic.reviewNotes && (
                <p className="notice">{clinic.reviewNotes}</p>
              )}
              {clinic.status === "pending_review" && (
                <div className="form-actions">
                  <button
                    className="button secondary"
                    onClick={() => {
                      setReview({ ...clinic, decision: "rejected" });
                      setNotes("");
                      setError("");
                    }}
                  >
                    Reject registration
                  </button>
                  <button
                    className="button"
                    onClick={() => {
                      setReview({ ...clinic, decision: "approved" });
                      setNotes("");
                      setError("");
                    }}
                  >
                    Approve clinic
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
