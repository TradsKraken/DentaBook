import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { api } from "../api";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [state, setState] = useState({
    loading: true,
    session: null,
    error: "",
  });
  const refresh = useCallback(async () => {
    setState((previous) => ({ ...previous, loading: true, error: "" }));
    try {
      const session = await api("/auth/me");
      setState({ loading: false, session, error: "" });
      return session;
    } catch (error) {
      if (error.status === 401) {
        setState({ loading: false, session: null, error: "" });
        return null;
      }
      setState({ loading: false, session: null, error: error.message });
      throw error;
    }
  }, []);
  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);
  const signOut = async () => {
    await api("/auth/logout", { method: "POST" });
    setState({ loading: false, session: null, error: "" });
  };
  return (
    <AuthContext.Provider value={{ ...state, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  return useContext(AuthContext);
}
export function WorkspaceGate({ role, children }) {
  const location = useLocation();
  const { loading, error, session, refresh } = useAuth();
  if (loading)
    return (
      <div className="wrap page">
        <div className="panel empty" role="status">
          Checking your account…
        </div>
      </div>
    );
  if (error)
    return (
      <div className="wrap page">
        <div className="panel empty" role="alert">
          <h1>We couldn’t check your account.</h1>
          <p>{error}</p>
          <button className="button" onClick={() => refresh().catch(() => {})}>
            Try again
          </button>
        </div>
      </div>
    );
  if (!session)
    return (
      <Navigate
        to={
          role === "patient"
            ? `/patient/sign-in?next=${encodeURIComponent(location.pathname + location.search)}`
            : role === "system_admin"
              ? "/admin/sign-in"
              : "/clinic/sign-in"
        }
        replace
      />
    );
  if (session.user.role !== role)
    return (
      <div className="wrap page">
        <div className="panel empty">
          <h1>
            {role === "patient"
              ? "Use a patient account to continue."
              : "Access restricted."}
          </h1>
          <p>This workspace is not available to your account.</p>
          {role === "patient" && (
            <Link
              className="button"
              to={`/patient/sign-in?next=${encodeURIComponent(location.pathname + location.search)}`}
            >
              Switch to patient sign-in
            </Link>
          )}
        </div>
      </div>
    );
  return children;
}
