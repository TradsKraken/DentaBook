import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ArrowRight, Mail } from "lucide-react";
import { PageTitle } from "../components/Shared";
import { api } from "../api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/auth/forgot-password", {
        method: "POST",
        body: { email: cleanEmail },
      });
      setSent(true);
    } catch (err) {
      setError(err.message || "Failed to send password reset email.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="wrap page">
        <section className="panel success-panel">
          <span className="success-icon">
            <CheckCircle2 size={40} />
          </span>
          <p className="eyebrow">RESET INSTRUCTIONS SENT</p>
          <h1>Check your email inbox.</h1>
          <p className="muted">
            If an account matches <strong>{email}</strong>, we have sent instructions to reset your password. The link and 6-digit code are valid for 15 minutes.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 24 }}>
            <Link
              className="button"
              to={`/patient/reset-password?email=${encodeURIComponent(email)}`}
            >
              Enter 6-digit reset code <ArrowRight size={16} />
            </Link>
            <Link className="button secondary" to="/patient/sign-in">
              Return to sign in
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="wrap page">
      <div className="account-panel">
        <PageTitle
          eyebrow="ACCOUNT RECOVERY"
          title="Forgot your password?"
          text="Enter the email address associated with your account, and we’ll send you a password reset link and 6-digit code."
        />

        <form className="panel" onSubmit={submit}>
          <label className="field">
            Email address
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="juan@example.com"
              required
              autoComplete="email"
            />
          </label>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div style={{ marginTop: 16 }}>
            <button className="button full" disabled={busy} aria-busy={busy}>
              {busy ? "Sending instructions…" : "Send password reset instructions"}
            </button>
          </div>

          <div style={{ marginTop: 20, textAlign: "center" }}>
            <Link className="text-link" to="/patient/sign-in">
              Remembered your password? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
