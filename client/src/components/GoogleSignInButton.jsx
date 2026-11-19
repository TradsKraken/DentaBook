import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../api";

export default function GoogleSignInButton({
  destination = "/patient/account",
  text = "Continue with Google",
  onSuccess,
  onError,
}) {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const nativeBtnRef = useRef(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showDevModal, setShowDevModal] = useState(false);
  const [devEmail, setDevEmail] = useState("patient.juan@gmail.com");
  const [devName, setDevName] = useState("Juan Dela Cruz");
  const [gisLoaded, setGisLoaded] = useState(false);

  const googleClientId =
    (typeof window !== "undefined" && window.DENTABOOK_GOOGLE_CLIENT_ID) ||
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    "";

  // Dynamically load Google Identity Services if a Client ID is provided
  useEffect(() => {
    if (!googleClientId) return;
    if (window.google?.accounts?.id) {
      setGisLoaded(true);
      return;
    }
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", () => setGisLoaded(true));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setGisLoaded(true);
    document.head.appendChild(script);
  }, [googleClientId]);

  // Initialize GIS and render native Google button if client ID is configured
  useEffect(() => {
    if (!googleClientId || !gisLoaded || !window.google?.accounts?.id) return;
    try {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => {
          if (response?.credential) {
            handleCredential(response.credential);
          }
        },
      });

      if (nativeBtnRef.current) {
        nativeBtnRef.current.innerHTML = "";
        const buttonWidth = Math.min(
          320,
          Math.max(240, typeof window !== "undefined" && window.innerWidth ? window.innerWidth - 64 : 280)
        );
        window.google.accounts.id.renderButton(nativeBtnRef.current, {
          theme: "outline",
          size: "large",
          width: buttonWidth,
          shape: "rectangular",
          text: text.toLowerCase().includes("up") ? "signup_with" : "signin_with",
        });
      }
    } catch (err) {
      console.warn("GIS initialization warning:", err);
    }
  }, [googleClientId, gisLoaded, text]);

  async function handleCredential(credential) {
    setBusy(true);
    setError("");
    try {
      await api("/auth/google", {
        method: "POST",
        body: { credential },
      });
      const current = await refresh();
      if (onSuccess) {
        onSuccess(current);
      } else {
        navigate(destination, { replace: true });
      }
    } catch (err) {
      const msg = err.message || "Failed to sign in with Google.";
      setError(msg);
      if (onError) onError(msg);
    } finally {
      setBusy(false);
    }
  }

  function handleGoogleClick() {
    setError("");
    // If real Google Identity is available and client ID is configured, trigger One Tap prompt
    if (googleClientId && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setShowDevModal(true);
          }
        });
        return;
      } catch (err) {
        console.warn("Google One Tap error:", err);
      }
    }

    // In development or when no Client ID is provided yet, open dev modal
    setShowDevModal(true);
  }

  function submitDevGoogle(e) {
    e.preventDefault();
    setShowDevModal(false);
    const mockPayload = {
      email: devEmail.trim().toLowerCase(),
      sub: "google-sub-" + Math.abs(hashCode(devEmail)),
      name: devName.trim(),
    };
    handleCredential(`mock-google-token:${JSON.stringify(mockPayload)}`);
  }

  return (
    <div className="google-auth-container">
      {googleClientId && gisLoaded ? (
        <div style={{ display: "flex", justifyContent: "center", width: "100%", minHeight: 44 }}>
          <div ref={nativeBtnRef} style={{ width: "100%", display: "flex", justifyContent: "center" }} />
        </div>
      ) : (
        <button
          type="button"
          className="google-sign-in-btn"
          onClick={handleGoogleClick}
          disabled={busy}
          aria-busy={busy}
        >
          <GoogleIcon />
          <span>{busy ? "Connecting to Google…" : text}</span>
        </button>
      )}

      {error && (
        <p className="form-error" role="alert" style={{ marginTop: 8 }}>
          {error}
        </p>
      )}

      {showDevModal && (
        <div className="dev-google-dialog-backdrop" role="dialog" aria-modal="true">
          <div className="dev-google-dialog panel">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <GoogleIcon />
              <h3 style={{ margin: 0, fontSize: 18 }}>Sign in with Google</h3>
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
              {googleClientId
                ? "Simulate Google OAuth in your local testing environment:"
                : "Development preview: Sign in as a Google account user:"}
            </p>
            <form onSubmit={submitDevGoogle}>
              <label className="field" style={{ marginBottom: 12 }}>
                Full Name
                <input
                  type="text"
                  value={devName}
                  onChange={(e) => setDevName(e.target.value)}
                  required
                />
              </label>
              <label className="field" style={{ marginBottom: 16 }}>
                Google Email
                <input
                  type="email"
                  value={devEmail}
                  onChange={(e) => setDevEmail(e.target.value)}
                  required
                />
              </label>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setShowDevModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="button">
                  Continue as {devName.split(" ")[0]}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function GoogleIcon() {
  return (
    <svg
      className="google-g-icon"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.347 2.825.957 4.039l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
