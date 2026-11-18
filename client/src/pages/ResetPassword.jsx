import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { PageTitle } from "../components/Shared";
import PasswordField from "../components/PasswordField";
import { api } from "../api";

export default function ResetPassword() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tokenFromUrl = searchParams.get("token") || "";
  const emailFromUrl = searchParams.get("email") || "";

  const [token, setToken] = useState(tokenFromUrl);
  const [email, setEmail] = useState(emailFromUrl);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resetDone, setResetDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (password.length < 12) {
      setError("Password must be at least 12 characters long.");
      return;
    }
    if (new TextEncoder().encode(password).length > 72) {
      setError("Password cannot exceed 72 bytes.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const body = { password };
      if (token) {
        body.token = token.trim();
      } else {
        const cleanCode = code.trim();
        const cleanEmail = email.trim().toLowerCase();
        if (!/^\d{6}$/.test(cleanCode)) {
          setError("Please enter a valid 6-digit reset code.");
          setBusy(false);
          return;
        }
        if (!cleanEmail) {
          setError("Please enter your account email address.");
          setBusy(false);
          return;
        }
        body.code = cleanCode;
        body.email = cleanEmail;
      }

      await api("/auth/reset-password", {
        method: "POST",
        body,
      });

      setResetDone(true);
    } catch (err) {
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (resetDone) {
    return (
      <div className="wrap page">
        <section className="panel success-panel">
          <span className="success-icon">
            <CheckCircle2 size={40} />
          </span>
          <p className="eyebrow">PASSWORD RESET SUCCESSFUL</p>
          <h1>Your password has been changed.</h1>
          <p className="muted">
            You can now sign in to your DentaBook account using your new password.
          </p>
          <div style={{ marginTop: 24 }}>
            <Link className="button" to="/patient/sign-in">
              Sign in now <ArrowRight size={16} />
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
          title="Reset your password."
          text="Create a strong, secure password of at least 12 characters."
        />

        <form className="panel" onSubmit={submit}>
          {!token && (
            <>
              <label className="field">
                Account email address
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

              <label className="field">
                6-digit reset code
                <input
                  type="text"
                  name="code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  style={{ letterSpacing: "4px", fontSize: "18px", fontWeight: "bold" }}
                  required
                />
              </label>
            </>
          )}

          <PasswordField
            label="New password"
            name="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={12}
            maxLength={72}
            autoComplete="new-password"
            required
          />
          <p className="field-hint">
            Use at least 12 characters. Passwords can contain up to 72 UTF-8 bytes.
          </p>

          <PasswordField
            label="Confirm new password"
            name="confirm-new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={12}
            maxLength={72}
            autoComplete="new-password"
            required
          />

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div style={{ marginTop: 16 }}>
            <button className="button full" disabled={busy} aria-busy={busy}>
              {busy ? "Resetting password…" : "Reset password"}
            </button>
          </div>

          <div style={{ marginTop: 20, textAlign: "center" }}>
            <Link className="text-link" to="/patient/sign-in">
              Return to sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
