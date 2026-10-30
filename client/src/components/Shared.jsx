import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Search, Stethoscope } from "lucide-react";
import { useClinics } from "../hooks/useClinics";

export function Tooth({ size = 24, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M16 6C10 1 3 5 5 13c1 5 2 14 5 14 3 0 2-10 6-10s3 10 6 10c3 0 4-9 5-14 2-8-5-12-11-7Z" />
      <path d="M12 5c2 2 5 3 8 3" />
    </svg>
  );
}
export function PortalLink({ portal, to, children, ...props }) {
  const origin = portal === "patient" ? import.meta.env.VITE_PATIENT_URL : import.meta.env.VITE_CLINIC_URL;
  return origin ? <a {...props} href={origin + to}>{children}</a> : <Link {...props} to={to}>{children}</Link>;
}

export function Brand() {
  return (
    <PortalLink portal="patient" className="brand" to="/" aria-label="DentaBook home">
      <img src="/branding/dentabook-logo.jpg" alt="" />
      <span>
        Denta<span>Book</span>
        <small>BOOK YOUR SMILE. KNOW YOUR COST.</small>
      </span>
    </PortalLink>
  );
}
export function Heading({ eyebrow, title, text, children }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {text && <p className="muted">{text}</p>}
      </div>
      {children}
    </div>
  );
}
export function PageTitle({ eyebrow, title, text }) {
  return (
    <div className="page-title">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {text && <p className="muted">{text}</p>}
    </div>
  );
}
export function DirectoryState({ children }) {
  const { loading, error, retry, clinics } = useClinics();
  if (loading)
    return (
      <div className="panel empty" role="status">
        <Stethoscope size={32} />
        <p>Finding dental clinics…</p>
      </div>
    );
  if (error)
    return (
      <div className="panel empty" role="alert">
        <Search size={32} />
        <h2>We couldn’t load the clinics.</h2>
        <p>Please try again in a moment.</p>
        <button className="button secondary" onClick={retry}>
          Try again
        </button>
      </div>
    );
  if (!clinics.length)
    return (
      <div className="panel empty">
        <Tooth size={40} />
        <h2>No clinics listed yet.</h2>
        <p>Clinic profiles will appear here once they are approved.</p>
      </div>
    );
  return children;
}
export function ClinicCard({ clinic }) {
  return (
    <article className="clinic-card">
      <Link
        className="clinic-placeholder"
        to={`/clinics/${clinic.id}`}
        aria-label={`View ${clinic.name}`}
      >
        <Tooth size={60} />
      </Link>
      <div className="clinic-card-body">
        <div className="clinic-title">
          <Link to={`/clinics/${clinic.id}`}>
            <h3>{clinic.name}</h3>
          </Link>
        </div>
        <p>
          <MapPin size={14} />
          {clinic.address}
        </p>
        {clinic.services.length > 0 && (
          <div className="clinic-tags">
            {clinic.services.slice(0, 3).map((s) => (
              <span key={s.id}>{s.name}</span>
            ))}
          </div>
        )}
        <Link className="text-link" to={`/clinics/${clinic.id}`}>
          View clinic <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  );
}
export function Unavailable({ title, text }) {
  return (
    <div className="wrap page">
      <div className="panel empty">
        <Stethoscope size={38} />
        <h1>{title}</h1>
        <p className="muted">{text}</p>
        <Link className="button" to="/clinics">
          Browse clinics <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
