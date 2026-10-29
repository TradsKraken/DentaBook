import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowRight, Calculator, MapPin, Search } from "lucide-react";
import {
  ClinicCard,
  DirectoryState,
  PageTitle,
  Tooth,
} from "../components/Shared";
import { useClinics } from "../hooks/useClinics";
import { treatments } from "../content/treatments";

const money = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
export function Directory() {
  const params = new URLSearchParams(useLocation().search);
  const { clinics } = useClinics();
  const [query, setQuery] = useState(params.get("q") || "");
  const [location, setLocation] = useState(params.get("location") || "");
  const [service, setService] = useState("");
  const results = clinics.filter((clinic) => {
    const terms = [
      clinic.name,
      clinic.address,
      ...clinic.dentists.map((d) => d.name),
      ...clinic.services.map((s) => s.name),
    ]
      .join(" ")
      .toLowerCase();
    return (
      terms.includes(query.trim().toLowerCase()) &&
      clinic.address.toLowerCase().includes(location.trim().toLowerCase()) &&
      (!service || clinic.services.some((s) => s.category === service))
    );
  });
  return (
    <div className="wrap page">
      <PageTitle
        eyebrow="FIND YOUR FIT"
        title="Good care is closer than you think."
        text="Explore listed dental clinics and find information to plan your care."
      />
      <div className="filter-bar">
        <label className="search-input">
          <Search size={19} />
          <input
            aria-label="Search clinics"
            placeholder="Clinic, dentist, or service"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <input
          aria-label="Location"
          placeholder="City or address"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
        />
        <select
          aria-label="Service category"
          value={service}
          onChange={(event) => setService(event.target.value)}
        >
          <option value="">All service categories</option>
          {[
            "Preventive",
            "Restorative",
            "Cosmetic",
            "Surgical",
            "Orthodontic",
            "General",
          ].map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
        <button
          className="button secondary"
          onClick={() => {
            setQuery("");
            setLocation("");
            setService("");
          }}
        >
          Reset filters
        </button>
      </div>
      <DirectoryState>
        <p className="result-count">
          {results.length} {results.length === 1 ? "clinic" : "clinics"} found
        </p>
        {results.length ? (
          <div className="clinic-grid">
            {results.map((clinic) => (
              <ClinicCard clinic={clinic} key={clinic.id} />
            ))}
          </div>
        ) : (
          <div className="panel empty">
            <Search size={35} />
            <h2>No clinics match your search.</h2>
            <p>Try another location or reset your filters.</p>
          </div>
        )}
      </DirectoryState>
    </div>
  );
}
export function Clinic() {
  const { id } = useParams();
  const { clinics, loading, error } = useClinics();
  const [tab, setTab] = useState("About");
  const clinic = clinics.find((clinic) => clinic.id === id);
  if (loading || error)
    return (
      <div className="wrap page">
        <DirectoryState />
      </div>
    );
  if (!clinic)
    return (
      <div className="wrap page">
        <PageTitle
          title="Clinic not found."
          text="This clinic may no longer be listed."
        />
        <Link className="button" to="/clinics">
          Browse clinics
        </Link>
      </div>
    );
  return (
    <div className="wrap page">
      <Link className="back-link" to="/clinics">
        ← Back to clinics
      </Link>
      <div className="profile-heading">
        <div>
          <p className="eyebrow">DENTAL CLINIC</p>
          <h1>{clinic.name}</h1>
          <p className="detail-line">
            <MapPin size={18} />
            {clinic.address}
          </p>
        </div>
        <a
          className="button"
          href={`tel:${clinic.phone.replace(/[^+0-9]/g, "")}`}
        >
          Call clinic
        </a>
      </div>
      <div className="tabs" aria-label="Clinic information">
        {["About", "Services", "Dentists"].map((name) => (
          <button
            key={name}
            aria-pressed={tab === name}
            className={tab === name ? "active" : ""}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="profile-layout">
        <section className="panel">
          {tab === "About" ? (
            <>
              <h2>About the clinic</h2>
              <p className="muted">
                {clinic.description ||
                  "The clinic has not added a description yet."}
              </p>
              <h3>Contact the clinic</h3>
              <p className="detail-line">
                <MapPin size={18} />
                {clinic.address}
              </p>
              <a
                className="text-link"
                href={`tel:${clinic.phone.replace(/[^+0-9]/g, "")}`}
              >
                {clinic.phone}
              </a>
              <br />
              <a className="text-link" href={`mailto:${clinic.email}`}>
                {clinic.email}
              </a>
            </>
          ) : tab === "Services" ? (
            <>
              <h2>Clinic services</h2>
              {clinic.services.length ? (
                clinic.services.map((service) => (
                  <div className="service-row" key={service.id}>
                    <Tooth />
                    <div>
                      <strong>{service.name}</strong>
                      <small>{service.category}</small>
                    </div>
                    <strong>{money(service.price)}</strong>
                  </div>
                ))
              ) : (
                <p className="muted">
                  This clinic has not published services yet.
                </p>
              )}
            </>
          ) : (
            <>
              <h2>Meet the dentists</h2>
              {clinic.dentists.length ? (
                clinic.dentists.map((dentist) => (
                  <article className="dentist-details" key={dentist.id}>
                    <h3>{dentist.name}</h3>
                    <p>{dentist.title}</p>
                    {dentist.credentials && (
                      <p className="muted">{dentist.credentials}</p>
                    )}
                  </article>
                ))
              ) : (
                <p className="muted">
                  This clinic has not published dentist profiles yet.
                </p>
              )}
            </>
          )}
        </section>
        <aside className="panel soft-panel">
          <span className="icon-tile">
            <Calculator />
          </span>
          <h2>Plan your treatment budget.</h2>
          <p className="muted">
            Use this clinic’s published prices to calculate an estimate.
          </p>
          <Link
            className="button secondary"
            to={`/calculator?clinic=${clinic.id}`}
          >
            Estimate my cost <ArrowRight size={17} />
          </Link>
          <p className="summary-note">
            Final treatment costs are confirmed by the clinic after assessment.
          </p>
        </aside>
      </div>
    </div>
  );
}
export function Services() {
  return (
    <div className="wrap page">
      <PageTitle
        eyebrow="CARE FOR YOUR SMILE"
        title="Explore your dental care options."
        text="Find a clinic to discuss the right treatment for you."
      />
      <div className="treatment-grid">
        {treatments.map((service) => (
          <article className="panel treatment" key={service.id}>
            <span className="service-icon">
              <Tooth size={32} />
            </span>
            <p className="eyebrow">{service.category}</p>
            <h2>{service.name}</h2>
            <p className="muted">{service.description}</p>
            <Link
              className="text-link"
              to={`/clinics?q=${encodeURIComponent(service.name)}`}
            >
              Find a clinic <ArrowRight size={16} />
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
export function Estimator() {
  const { clinics } = useClinics();
  const requestedId = new URLSearchParams(useLocation().search).get("clinic");
  const [clinicId, setClinicId] = useState(requestedId || "");
  const [selected, setSelected] = useState([]);
  const clinic = clinics.find((clinic) => clinic.id === clinicId);
  const selectedServices = clinic
    ? clinic.services.filter((service) => selected.includes(service.id))
    : [];
  // These are displayed estimates, not payment amounts. Billing will be calculated on the server.
  const total = selectedServices.reduce(
    (sum, service) => sum + Number(service.price),
    0,
  );
  return (
    <div className="wrap page">
      <PageTitle
        eyebrow="PLAN WITH CLARITY"
        title="Understand your treatment estimate."
        text="Select a clinic to view its published service prices."
      />
      <DirectoryState>
        <div className="two-column">
          <section className="panel">
            <h2>Choose your care.</h2>
            <label className="field">
              Choose a clinic
              <select
                value={clinicId}
                onChange={(event) => {
                  setClinicId(event.target.value);
                  setSelected([]);
                }}
              >
                <option value="">Select a clinic</option>
                {clinics.map((clinic) => (
                  <option key={clinic.id} value={clinic.id}>
                    {clinic.name}
                  </option>
                ))}
              </select>
            </label>
            {clinic &&
              (clinic.services.length ? (
                <div className="service-picker">
                  {clinic.services.map((service) => (
                    <label key={service.id}>
                      <input
                        type="checkbox"
                        checked={selected.includes(service.id)}
                        onChange={() =>
                          setSelected((previous) =>
                            previous.includes(service.id)
                              ? previous.filter((id) => id !== service.id)
                              : [...previous, service.id],
                          )
                        }
                      />
                      <span>
                        <strong>{service.name}</strong>
                        <small>{service.category}</small>
                      </span>
                      <strong>{money(service.price)}</strong>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="muted">
                  This clinic has not published service prices yet.
                </p>
              ))}
          </section>
          <aside className="panel summary">
            <p className="eyebrow">YOUR TREATMENT BUDGET</p>
            <h2>Cost estimate</h2>
            {!selectedServices.length ? (
              <p className="muted">
                Select a clinic and treatments to see an estimate.
              </p>
            ) : (
              <>
                <div className="summary-items">
                  {selectedServices.map((service) => (
                    <div key={service.id}>
                      <span>{service.name}</span>
                      <strong>{money(service.price)}</strong>
                    </div>
                  ))}
                </div>
                <div className="total-row">
                  <span>Estimated total</span>
                  <strong>{money(total)}</strong>
                </div>
              </>
            )}
            <p className="summary-note">
              Final costs may vary after a dental assessment. Contact the clinic
              to confirm treatment and payment requirements.
            </p>
            {clinic && (
              <Link className="button full" to={`/clinics/${clinic.id}`}>
                View clinic contact details <ArrowRight size={17} />
              </Link>
            )}
          </aside>
        </div>
      </DirectoryState>
    </div>
  );
}
