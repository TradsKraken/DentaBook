import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { ArrowUpRight, CalendarDays, Menu, X } from "lucide-react";
import { ClinicProvider } from "./hooks/useClinics";
import { Brand, Unavailable } from "./components/Shared";
import Home from "./pages/Home";
import { Directory, Clinic, Services, Estimator } from "./pages/Catalog";
import About from "./pages/About";
import { AuthProvider, WorkspaceGate } from "./hooks/useAuth";
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
  const [menu, setMenu] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    setMenu(false);
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
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
            <NavLink className="mobile-nav-link" to="/book">
              Book a visit
            </NavLink>
            <NavLink className="mobile-nav-link" to="/sign-in">
              Clinic sign in
            </NavLink>
          </nav>
          <div className="header-actions">
            <NavLink className="appointments-link" to="/appointments">
              <CalendarDays size={16} />
              My appointments
            </NavLink>
            <Link className="button small" to="/book">
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
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/clinics" element={<Directory />} />
          <Route path="/clinics/:id" element={<Clinic />} />
          <Route path="/services" element={<Services />} />
          <Route path="/calculator" element={<Estimator />} />
          <Route path="/about" element={<About />} />
          <Route path="/register-clinic" element={<Registration />} />
          <Route path="/sign-in" element={<SignIn />} />
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
            path="/book"
            element={
              <Unavailable
                title="Online booking is not available yet."
                text="You can contact a listed clinic directly using the details on its profile."
              />
            }
          />
          <Route
            path="/appointments"
            element={
              <Unavailable
                title="Appointment tracking is not available yet."
                text="Please contact your clinic for updates on an existing appointment."
              />
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
      <Footer />
    </>
  );
}
function Footer() {
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
          <Link to="/book">Book an appointment</Link>
          <Link to="/appointments">My appointments</Link>
          <Link to="/about">About DentaBook</Link>
        </div>
        <div className="footer-note">
          <h3>
            Book your smile.
            <br />
            Know your cost.
          </h3>
          <p>Find information to help you plan your dental care.</p>
          <Link to="/register-clinic">Register your clinic</Link>
          <Link to="/sign-in">Clinic &amp; administrator sign in</Link>
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
