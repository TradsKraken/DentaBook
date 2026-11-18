import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, AlertCircle, ArrowRight, Mail, Send } from "lucide-react";
import { PageTitle } from "../components/Shared";
import { useAuth } from "../hooks/useAuth";
import { api } from "../api";

export default function VerifyEmail() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tokenFromUrl = searchParams.get("token") || "";
  const emailFromUrl = searchParams.get("email") || "";

  const { session, refresh } = useAuth();
  const user = session?.user;
  const loggedInEmail = user?.email || "";

  const [code, setCode] = useState("");
  const [emailInput, setEmailInput] = useState(emailFromUrl || loggedInEmail);
  const [busy, setBusy] = useState(false);
  const [autoVerifying, setAutoVerifying] = useState(!!tokenFromUrl);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [resendStatus, setResendStatus] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (loggedInEmail && !emailInput) {
      setEmailInput(loggedInEmail);
    }
  }, [loggedInEmail]);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (tokenFromUrl) {
      verifyWithToken(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  async function verifyWithToken(token) {
    setAutoVerifying(true);
    setError("");
    try {
      await api("/auth/verify-email", {
        method: "POST",
        body: { token },
      });
      setVerified(true);
      await refresh({ quiet: true });
    } catch (err) {
      setError(err.message || "This verification link is invalid or has expired.");
    } finally {
      setAutoVerifying(false);
    }
  }

  async function submitCode(e) {
    e.preventDefault();
    const cleanCode = code.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      setError("Please enter a valid 6-digit verification code.");
      return;
    }
    setBusy(true);
    setError("");
    setResendStatus("");
    try {
      const body = { code: cleanCode };
      if (!session && emailInput) {
        body.email = emailInput.trim().toLowerCase();
      }
      await api("/auth/verify-email", {
        method: "POST",
        body,
      });
      setVerified(true);
      await refresh({ quiet: true });
    } catch (err) {
      setError(err.message || "Failed to verify code. Please check and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    if (cooldown > 0 || busy) return;
    setBusy(true);
    setError("");
    setResendStatus("");
    try {
      if (session) {
        await api("/auth/resend-verification", { method: "POST" });
        setResendStatus("A new verification code and link have been sent to your email.");
        setCooldown(60);
      } else if (emailInput) {
        await api("/auth/forgot-password", {
          method: "POST",
          body: { email: emailInput.trim().toLowerCase() },
        });
        setResendStatus("If an account exists for this email, verification instructions have been sent.");
        setCooldown(60);
      }
    } catch (err) {
      setError(err.message || "Failed to resend verification. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (autoVerifying) {
    return (
      <div className="wrap page">
        <div className="account-panel panel" style={{ textAlign: "center", padding: "40px 20px" }}>
          <p className="eyebrow">EMAIL VERIFICATION</p>
          <h2>Verifying your email address…</h2>
          <p className="muted">Please wait while we confirm your verification link.</p>
        </div>
      </div>
    );
  }

  if (verified || (user?.role === "patient" && user?.isEmailVerified)) {
    return (
      <div className="wrap page">
        <section className="panel success-panel">
          <span className="success-icon">
            <CheckCircle2 size={40} />
          </span>
          <p className="eyebrow">EMAIL VERIFIED</p>
          <h1>Your email address is verified.</h1>
          <p className="muted">
            You have full access to book dental appointments and manage your dental visits across all verified clinics.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 20 }}>
            <Link className="button" to="/patient/book">
              Book an appointment <ArrowRight size={16} />
            </Link>
            <Link className="button secondary" to="/patient/account">
              My account
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
          eyebrow="EMAIL VERIFICATION"
          title="Verify your email address."
          text="Enter the 6-digit code sent to your email, or click the link in the email we sent you."
        />

        <form className="panel" onSubmit={submitCode}>
          {!session && (
            <label className="field">
              Your account email address
              <input
                type="email"
                name="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="juan@example.com"
                required
                autoComplete="email"
              />
            </label>
          )}

          <label className="field">
            6-digit verification code
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

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          {resendStatus && (
            <p className="notice" role="status">
              {resendStatus}
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
            <button
              type="submit"
              className="button full"
              disabled={busy || code.length !== 6}
              aria-busy={busy}
            >
              {busy ? "Verifying…" : "Verify email"}
            </button>

            {session && (
              <button
                type="button"
                className="button secondary full"
                onClick={resendCode}
                disabled={busy || cooldown > 0}
              >
                <Send size={15} />
                {cooldown > 0 ? `Resend email (${cooldown}s)` : "Resend verification email"}
              </button>
            )}
          </div>

          <div style={{ marginTop: 20, textAlign: "center" }}>
            <Link className="text-link" to="/patient/account">
              Back to my account
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
