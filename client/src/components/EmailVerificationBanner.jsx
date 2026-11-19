import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, Mail, Edit3, Send, X, ArrowRight } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../api";

export default function EmailVerificationBanner() {
  const { session, refresh } = useAuth();
  const user = session?.user;
  const isPatient = user?.role === "patient";
  const isUnverified = isPatient && user?.isEmailVerified === false;

  const [mode, setMode] = useState("none"); // "none", "code", "change"
  const [code, setCode] = useState("");
  const [newEmail, setNewEmail] = useState("");
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
      setStatusMessage(`Verification email sent to ${user?.email}! Please check your inbox.`);
      setCooldown(60);
      setMode("code");
    } catch (err) {
      setErrorMessage(err.message || "Failed to resend email. Please try again later.");
    } finally {
      setResending(false);
    }
  }

  async function handleChangeEmail(e) {
    e.preventDefault();
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    setBusy(true);
    setErrorMessage("");
    setStatusMessage("");
    try {
      const res = await api("/auth/change-email", {
        method: "POST",
        body: { newEmail: cleanEmail },
      });
      await refresh({ quiet: true });
      setStatusMessage(`Email updated to ${cleanEmail}! We've sent a 6-digit verification code to your new email.`);
      setNewEmail("");
      setMode("code");
      setCooldown(60);
    } catch (err) {
      setErrorMessage(err.message || "Failed to update email. Please try again.");
    } finally {
      setBusy(false);
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
              <strong>Security update: Email verification is required to book appointments.</strong>
              <div style={{ marginTop: 2, fontSize: "13px" }}>
                We have <span className="verification-email-chip">{user?.email}</span> on file. Verify this email or change to a different email address:
              </div>
            </div>
          </div>

          <div className="verification-banner-actions">
            <button
              type="button"
              className="button small secondary verification-btn"
              onClick={() => setMode((m) => (m === "code" ? "none" : "code"))}
              aria-expanded={mode === "code"}
            >
              {mode === "code" ? "Hide code input" : "Enter 6-digit code"}
            </button>
            <button
              type="button"
              className="button small secondary verification-btn"
              onClick={handleResendEmail}
              disabled={resending || cooldown > 0}
              aria-busy={resending}
            >
              <Send size={14} />
              {cooldown > 0 ? `Resend (${cooldown}s)` : resending ? "Sending…" : "Send to current email"}
            </button>
            <button
              type="button"
              className="button small secondary verification-btn"
              onClick={() => setMode((m) => (m === "change" ? "none" : "change"))}
              aria-expanded={mode === "change"}
            >
              <Edit3 size={14} />
              {mode === "change" ? "Cancel change" : "Change email"}
            </button>
            <Link to="/patient/verify-email" className="verification-help-link">
              Verification page
            </Link>
          </div>
        </div>

        {mode === "code" && (
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
              placeholder="6-digit code"
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

        {mode === "change" && (
          <form className="verification-inline-form" onSubmit={handleChangeEmail}>
            <label htmlFor="banner-new-email" className="sr-only">
              New email address
            </label>
            <input
              id="banner-new-email"
              type="email"
              placeholder="Enter new email address"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="verification-code-input"
              style={{ minWidth: 240, letterSpacing: "normal", fontWeight: "normal" }}
              autoFocus
              required
            />
            <button
              type="submit"
              className="button small"
              disabled={busy || !newEmail.includes("@")}
              aria-busy={busy}
            >
              {busy ? "Updating…" : "Update & send code"}
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
