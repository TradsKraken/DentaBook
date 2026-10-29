import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { ArrowRight, CalendarDays, CheckCircle2 } from "lucide-react";
import { PageTitle } from "../components/Shared";
import { Field, SignOut } from "./Onboarding";
import { useAuth } from "../hooks/useAuth";
import { patientDestination } from "../patientNavigation";
import { api } from "../api";

const empty = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmation: "",
};
export function PatientRegistration() {
  const { session } = useAuth();
  const location = useLocation();
  const destination = patientDestination(
    new URLSearchParams(location.search).get("next"),
  );
  const signIn = `/patient/sign-in?next=${encodeURIComponent(destination)}`;
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState({});
  const [complete, setComplete] = useState(false);
  if (session?.user.role === "patient")
    return <Navigate to={destination} replace />;
  if (session)
    return (
      <div className="wrap page">
        <div className="panel empty">
          <h1>Switch to a patient account.</h1>
          <p>You’re currently signed in to a different portal.</p>
          <SignOut destination={location.pathname + location.search} />
        </div>
      </div>
    );
  async function submit(event) {
    event.preventDefault();
    setError("");
    setFields({});
    if (form.password !== form.confirmation) {
      setFields({ confirmation: "The passwords do not match." });
      return;
    }
    setBusy(true);
    try {
      const { confirmation, ...body } = form;
      await api("/auth/register-patient", { method: "POST", body });
      setForm(empty);
      setComplete(true);
    } catch (error) {
      setError(error.message);
      setFields(error.fields || {});
    } finally {
      setBusy(false);
    }
  }
  const change = (event) =>
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  if (complete)
    return (
      <div className="wrap page">
        <section className="panel success-panel">
          <span className="success-icon">
            <CheckCircle2 size={40} />
          </span>
          <h1>Your patient account is ready.</h1>
          <p className="muted">Sign in to continue to your requested page.</p>
          <Link className="button" to={signIn}>
            Sign in to continue <ArrowRight size={16} />
          </Link>
        </section>
      </div>
    );
  return (
    <div className="wrap page">
      <div className="account-panel">
        <PageTitle
          eyebrow="YOUR SMILE, YOUR ACCOUNT"
          title="Make room for your next visit."
          text="Browse without an account. Register to access booking and your personal appointment information."
        />
        <form className="panel" onSubmit={submit}>
          <Field
            label="Full name"
            name="name"
            value={form.name}
            onChange={change}
            error={fields.name}
            maxLength={150}
            autoComplete="name"
          />
          <Field
            label="Email address"
            name="email"
            type="email"
            value={form.email}
            onChange={change}
            error={fields.email}
            maxLength={254}
            autoComplete="email"
          />
          <Field
            label="Phone number"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={change}
            error={fields.phone}
            maxLength={30}
            autoComplete="tel"
          />
          <Field
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={change}
            error={fields.password}
            minLength={12}
            maxLength={72}
            autoComplete="new-password"
          />
          <p className="field-hint">
            Use at least 12 characters, up to 72 UTF-8 bytes.
          </p>
          <Field
            label="Confirm password"
            name="confirmation"
            type="password"
            value={form.confirmation}
            onChange={change}
            error={fields.confirmation}
            minLength={12}
            maxLength={72}
            autoComplete="new-password"
          />
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button full" disabled={busy}>
            {busy ? "Creating your account…" : "Create patient account"}
          </button>
          <Link className="text-link" to={signIn}>
            Already have an account? Sign in <ArrowRight size={16} />
          </Link>
        </form>
      </div>
    </div>
  );
}
export function PatientAccount() {
  const { session } = useAuth();
  return (
    <div className="wrap page">
      <div className="section-heading">
        <PageTitle
          eyebrow="YOUR PATIENT ACCOUNT"
          title={`Welcome, ${session.user.name}.`}
          text="Your personal space to plan and follow your dental care."
        />
        <SignOut />
      </div>
      <section className="panel">
        <h2>Account information</h2>
        <dl className="review-details">
          <dt>Name</dt>
          <dd>{session.user.name}</dd>
          <dt>Email</dt>
          <dd>{session.user.email}</dd>
        </dl>
        <div className="form-actions">
          <Link className="button secondary" to="/patient/appointments">
            My appointments <CalendarDays size={17} />
          </Link>
          <Link className="button" to="/patient/book">
            Plan a visit <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </div>
  );
}
export function PatientAppointments() {
  const { refresh } = useAuth();
  const [state, setState] = useState({
    loading: true,
    error: "",
    appointments: [],
  });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, error: "", appointments: [] });
    api("/workspaces/patient/appointments", { signal: controller.signal })
      .then((data) =>
        setState({
          loading: false,
          error: "",
          appointments: data.appointments,
        }),
      )
      .catch((error) => {
        if (!controller.signal.aborted) {
          setState({ loading: false, error: error.message, appointments: [] });
          if (error.status === 401) refresh().catch(() => {});
        }
      });
    return () => controller.abort();
  }, [attempt, refresh]);
  return (
    <div className="wrap page">
      <div className="section-heading">
        <PageTitle
          eyebrow="YOUR CARE, IN ONE PLACE"
          title="My appointments."
          text="Your latest 50 appointment records. Only appointments linked to your account appear here."
        />
        <Link className="button secondary" to="/patient/account">
          My account
        </Link>
      </div>
      {state.loading ? (
        <p role="status">Loading your appointments…</p>
      ) : state.error ? (
        <div className="panel empty" role="alert">
          <h2>We couldn’t load your appointments.</h2>
          <p>{state.error}</p>
          <button
            className="button secondary"
            onClick={() => setAttempt((n) => n + 1)}
          >
            Try again
          </button>
        </div>
      ) : !state.appointments.length ? (
        <div className="panel empty">
          <CalendarDays size={38} />
          <h2>No appointments yet.</h2>
          <p>
            Your appointment records will appear here once a booking is linked
            to your account.
          </p>
          <Link className="button" to="/patient/book">
            Plan your next visit <ArrowRight size={17} />
          </Link>
        </div>
      ) : (
        <div className="appointment-list">
          {state.appointments.map((appointment) => (
            <article className="panel" key={appointment.id}>
              <p className="eyebrow">{appointment.appointmentCode}</p>
              <h2>{appointment.clinicName}</h2>
              <p>
                {new Date(`${appointment.date}T12:00:00`).toLocaleDateString(
                  "en-PH",
                  { dateStyle: "long" },
                )}{" "}
                · {appointment.time}
              </p>
              {appointment.dentistName && (
                <p className="muted">{appointment.dentistName}</p>
              )}
              <p className="muted">{appointment.services.join(", ")}</p>
              <p className="notice">
                Status: {appointment.status.replaceAll("_", " ")}
              </p>
              <p>
                Estimated cost:{" "}
                {new Intl.NumberFormat("en-PH", {
                  style: "currency",
                  currency: "PHP",
                }).format(Number(appointment.total))}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
