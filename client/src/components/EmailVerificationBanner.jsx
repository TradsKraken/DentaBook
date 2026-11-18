import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, Mail, Send, X } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../api";

export default function EmailVerificationBanner() {
  const { session, refresh } = useAuth();
  const user = session?.user;
  const isPatient = user?.role === "patient";
  const isUnverified = isPatient && user?.isEmailVerified === false;

  const [expanded, setExpanded] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((c) => Math.max(0, c - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!isUnverified && !verifiedSuccess) {
    return null;
  }

  async function handleVerifyCode(e) {
    e.preventDefault();
    const cleanCode = code.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      setErrorMessage("Please enter a valid 6-digit code.");
      return;
    }
    setBusy(true);
    setErrorMessage("");
    setStatusMessage("");
    try {
      await api("/auth/verify-email", {
        method: "POST",
        body: { code: cleanCode },
      });
      setVerifiedSuccess(true);
      setStatusMessage("Your email address has been verified! You can now book appointments.");
      await refresh({ quiet: true });
    } catch (err) {
      setErrorMessage(err.message || "Failed to verify code. Please check and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResendEmail() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setErrorMessage("");
    setStatusMessage("");
    try {
      await api("/auth/resend-verification", { method: "POST" });
      setStatusMessage("Verification email sent! Please check your inbox and spam folder.");
      setCooldown(60);
    } catch (err) {
      setErrorMessage(err.message || "Failed to resend email. Please try again later.");
    } finally {
      setResending(false);
    }
  }

  if (verifiedSuccess) {
    return (
      <aside className="verification-banner-wrap verified" aria-live="polite">
        <div className="wrap verification-banner-content">
          <div className="verification-banner-text">
            <CheckCircle2 size={20} className="verification-icon success" />
            <span>{statusMessage || "Your email address is verified! You can now book appointments."}</span>
          </div>
          <button
            type="button"
            className="verification-banner-close"
            onClick={() => setVerifiedSuccess(false)}
            aria-label="Dismiss banner"
          >
            <X size={18} />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="verification-banner-wrap" aria-live="polite">
      <div className="wrap verification-banner-content">
        <div className="verification-banner-main">
          <div className="verification-banner-text">
            <AlertCircle size={20} className="verification-icon warning" />
            <div>
              <strong>Verify your email address to book appointments:</strong>{" "}
              We sent a verification link and 6-digit code to{" "}
              <span className="verification-email-chip">{user?.email}</span>.
            </div>
          </div>

          <div className="verification-banner-actions">
            <button
              type="button"
              className="button small secondary verification-btn"
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
            >
              {expanded ? "Hide code input" : "Enter 6-digit code"}
            </button>
            <button
              type="button"
              className="button small secondary verification-btn"
              onClick={handleResendEmail}
              disabled={resending || cooldown > 0}
              aria-busy={resending}
            >
              <Send size={14} />
              {cooldown > 0 ? `Resend email (${cooldown}s)` : resending ? "Sending…" : "Resend email"}
            </button>
            <Link to="/patient/verify-email" className="verification-help-link">
              Verification page
            </Link>
          </div>
        </div>

        {expanded && (
          <form className="verification-inline-form" onSubmit={handleVerifyCode}>
            <label htmlFor="banner-verification-code" className="sr-only">
              6-digit verification code
            </label>
            <input
              id="banner-verification-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="6-digit code (e.g. 123456)"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="verification-code-input"
              autoFocus
              required
            />
            <button
              type="submit"
              className="button small"
              disabled={busy || code.length !== 6}
              aria-busy={busy}
            >
              {busy ? "Verifying…" : "Submit code"}
            </button>
          </form>
        )}

        {statusMessage && (
          <p className="verification-banner-notice success" role="status">
            {statusMessage}
          </p>
        )}
        {errorMessage && (
          <p className="verification-banner-notice error" role="alert">
            {errorMessage}
          </p>
        )}
      </div>
    </aside>
  );
}
