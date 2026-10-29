import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const ClinicContext = createContext(null);
export function ClinicProvider({ children }) {
  const [state, setState] = useState({
    clinics: [],
    loading: true,
    error: false,
  });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    let active = true;
    setState({ clinics: [], loading: true, error: false });
    fetch("/api/clinics", {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Directory unavailable");
        const data = await response.json();
        if (!Array.isArray(data.clinics))
          throw new Error("Invalid directory response");
        if (active)
          setState({ clinics: data.clinics, loading: false, error: false });
      })
      .catch(() => {
        if (active) setState({ clinics: [], loading: false, error: true });
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);
  return (
    <ClinicContext.Provider value={{ ...state, retry }}>
      {children}
    </ClinicContext.Provider>
  );
}
export function useClinics() {
  return useContext(ClinicContext);
}
