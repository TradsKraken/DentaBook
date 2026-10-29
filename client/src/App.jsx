import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { ArrowUpRight, UserRound, Menu, X } from "lucide-react";
import { ClinicProvider } from "./hooks/useClinics";
import { Brand, Unavailable } from "./components/Shared";
import Home from "./pages/Home";
import { Directory, Clinic, Services, Estimator } from "./pages/Catalog";
import About from "./pages/About";
import { patientAuthSuffix } from "./patientNavigation";
import { AuthProvider, WorkspaceGate, useAuth } from "./hooks/useAuth";
import { usePageMotion } from "./hooks/usePageMotion";
import {
  PatientRegistration,
  PatientAccount,
  PatientAppointments,
} from "./pages/Patients";
import {
  Registration,
  SignIn,
  ClinicWorkspace,
  AdminWorkspace,
} from "./pages/Onboarding";

export default function App() {
  return (
    <BrowserRouter>
      <ClinicProvider>
        <AuthProvider>
          <Site />
        </AuthProvider>
      </ClinicProvider>
    </BrowserRouter>
  );
}
function Site() {
  const { session } = useAuth();
  const patient = session?.user.role === "patient";
  const [menu, setMenu] = useState(false);
  const { pathname, search } = useLocation();
  const motionRef = usePageMotion(pathname);
  const patientSignIn =
    "/patient/sign-in" + patientAuthSuffix({ pathname, search });
  const adminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  const clinicArea = pathname === "/clinic" || pathname.startsWith("/clinic/");
  useEffect(() => {
    setMenu(false);
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {adminArea || clinicArea ? (
        <header className="site-header">
          <div className="wrap header-inner">
            <Brand />
            <span className="admin-area-label">
              {adminArea ? "Platform administration" : "Clinic portal"}
            </span>
          </div>
        </header>
      ) : (
        <header className="site-header">
          <div className="wrap header-inner">
            <Brand />
            <nav
              id="main-navigation"
              className={menu ? "nav open" : "nav"}
              aria-label="Main navigation"
              onClick={(event) => {
                if (event.target.closest("a")) setMenu(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") setMenu(false);
              }}
            >
              <NavLink to="/" end>
                Home
              </NavLink>
              <NavLink to="/clinics">Find a clinic</NavLink>
              <NavLink to="/services">Services</NavLink>
              <NavLink to="/calculator">Cost calculator</NavLink>
              <NavLink to="/about">About us</NavLink>
              <NavLink className="mobile-nav-link" to="/patient/book">
                Book a visit
              </NavLink>
              <NavLink className="mobile-nav-link" to="/clinic/sign-in">
                Clinic sign in
              </NavLink>
              <NavLink
                className="mobile-nav-link"
                to={patient ? "/patient/account" : patientSignIn}
              >
                {patient ? "My account" : "Patient sign in"}
              </NavLink>
              <NavLink className="mobile-nav-link" to="/patient/appointments">
                My appointments
              </NavLink>
            </nav>
            <div className="header-actions">
              <NavLink
                className="appointments-link"
                to={patient ? "/patient/account" : patientSignIn}
              >
                <UserRound size={16} />
                {patient ? "My account" : "Sign in"}
              </NavLink>
              <Link className="button small" to="/patient/book">
                Book a visit <ArrowUpRight size={16} />
              </Link>
              <button
                className="menu-button"
                aria-label={menu ? "Close menu" : "Open menu"}
                aria-expanded={menu}
                aria-controls="main-navigation"
                onClick={() => setMenu(!menu)}
              >
                {menu ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </header>
      )}
      <main ref={motionRef} id="main" className={adminArea ? "admin-main" : undefined}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/clinics" element={<Directory />} />
          <Route path="/clinics/:id" element={<Clinic />} />
          <Route path="/services" element={<Services />} />
          <Route path="/calculator" element={<Estimator />} />
          <Route path="/about" element={<About />} />
          <Route path="/clinic/register" element={<Registration />} />
          <Route path="/register-clinic" element={<LegacyRedirect to="/clinic/register" />} />
          <Route path="/patient" element={<LegacyRedirect to="/patient/account" />} />
          <Route path="/account" element={<LegacyRedirect to="/patient/account" />} />
          <Route path="/appointments" element={<LegacyRedirect to="/patient/appointments" />} />
          <Route path="/book" element={<LegacyRedirect to="/patient/book" />} />
          <Route
            path="/sign-in"
            element={<Navigate to="/patient/sign-in" replace />}
          />
          <Route
            path="/patient/sign-in"
            element={<SignIn portal="patient" />}
          />
          <Route path="/patient/register" element={<PatientRegistration />} />
          <Route
            path="/patient/account"
            element={
              <WorkspaceGate role="patient">
                <PatientAccount />
              </WorkspaceGate>
            }
          />
          <Route path="/clinic/sign-in" element={<SignIn portal="clinic" />} />
          <Route path="/admin/sign-in" element={<SignIn portal="admin" />} />
          <Route
            path="/clinic"
            element={
              <WorkspaceGate role="clinic_staff">
                <ClinicWorkspace />
              </WorkspaceGate>
            }
          />
          <Route
            path="/admin"
            element={
              <WorkspaceGate role="system_admin">
                <AdminWorkspace />
              </WorkspaceGate>
            }
          />
          <Route
            path="/patient/book"
            element={
              <WorkspaceGate role="patient">
                <Unavailable
                  title="Online booking is not available yet."
                  text="You can contact a listed clinic directly using the details on its profile."
                />
              </WorkspaceGate>
            }
          />
          <Route
            path="/patient/appointments"
            element={
              <WorkspaceGate role="patient">
                <PatientAppointments />
              </WorkspaceGate>
            }
          />
          <Route
            path="*"
            element={
              <Unavailable
                title="Page not found."
                text="This page may have moved or is no longer available."
              />
            }
          />
        </Routes>
      </main>
      {!adminArea && !clinicArea && <Footer />}
    </>
  );
}
function LegacyRedirect({ to }) {
  const { search } = useLocation();
  return <Navigate to={to + search} replace />;
}
function Footer() {
  const suffix = patientAuthSuffix(useLocation());
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div>
          <Brand />
          <p>
            A little care. A brighter smile.
            <br />
            Your next dental visit, made simple.
          </p>
        </div>
        <div>
          <h3>Your smile</h3>
          <Link to="/clinics">Find a clinic</Link>
          <Link to="/services">Explore services</Link>
          <Link to="/calculator">Cost calculator</Link>
        </div>
        <div>
          <h3>Your next visit</h3>
          <Link to="/patient/book">Book an appointment</Link>
          <Link to="/patient/appointments">My appointments</Link>
          <Link to="/about">About DentaBook</Link>
          <Link to={"/patient/sign-in" + suffix}>Patient sign in</Link>
          <Link to={"/patient/register" + suffix}>Patient registration</Link>
        </div>
        <div className="footer-note">
          <h3>
            Book your smile.
            <br />
            Know your cost.
          </h3>
          <p>Find information to help you plan your dental care.</p>
          <Link to="/clinic/register">Register your clinic</Link>
          <Link to="/clinic/sign-in">Clinic sign in</Link>
        </div>
      </div>
      <div className="wrap footer-bottom">
        <span>
          © {new Date().getFullYear()} DentaBook. Every smile matters.
        </span>
        <span>Made for smiles in the Philippines</span>
      </div>
    </footer>
  );
}
