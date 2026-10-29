import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Calculator,
  CalendarDays,
  ChevronRight,
  Heart,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  Tooth,
  Heading,
  ClinicCard,
  DirectoryState,
} from "../components/Shared";
import { useClinics } from "../hooks/useClinics";
import { treatments } from "../content/treatments";

export default function Home() {
  const navigate = useNavigate();
  const { clinics } = useClinics();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <div className="pill">
              <span className="dot" />A healthier smile starts here
            </div>
            <h1>
              A little care.
              <br />A brighter <span>smile.</span>
            </h1>
            <p>
              Find dental clinics, explore treatment information,
              <br className="desktop-break" /> and take the next step in caring
              for your smile.
            </p>
            <form
              className="hero-search"
              onSubmit={(event) => {
                event.preventDefault();
                navigate(
                  `/clinics?q=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`,
                );
              }}
            >
              <div className="search-fields">
                <label>
                  <Search size={19} />
                  <input
                    aria-label="Search clinics or services"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Clinic, dentist, or service"
                  />
                </label>
                <label className="location-field">
                  <MapPin size={18} />
                  <input
                    aria-label="Location"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder="City or address"
                  />
                </label>
              </div>
              <button className="button" type="submit">
                Find my dentist <ArrowRight size={17} />
              </button>
            </form>
            <div className="hero-proof">
              <ShieldCheck size={23} />
              <span>
                Explore your options.
                <br />
                <strong>Plan your care.</strong>
              </span>
              <span className="proof-divider" />
              <Heart size={23} />
              <span>
                A little time for
                <br />
                <strong>a healthier smile.</strong>
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <img
              className="hero-image"
              src="/images/hero.jpg"
              alt="A dentist discussing dental care with a patient"
            />
            <div className="hero-arc" />
            <div className="float-card care-card">
              <span className="icon-tile">
                <Heart size={25} />
              </span>
              <div>
                <strong>Make time for your smile</strong>
                <span>Find information. Explore your options.</span>
              </div>
            </div>
            <div className="float-card price-card">
              <span className="icon-tile">
                <Search size={24} />
              </span>
              <div>
                <span>Your next step starts here.</span>
                <strong>Find a dental clinic.</strong>
                <Link to="/clinics">
                  Explore the directory <ArrowUpRight size={13} />
                </Link>
              </div>
            </div>
            <div className="hero-caption">
              A little confidence looks good on you. <Sparkles size={16} />
            </div>
          </div>
        </div>
      </section>
      <section className="quick-strip wrap" aria-label="Quick actions">
        {[
          {
            to: "/clinics",
            icon: Search,
            title: "Find your clinic",
            text: "Explore care near you",
          },
          {
            to: "/calculator",
            icon: Calculator,
            title: "Plan your budget",
            text: "View published treatment estimates",
          },
          {
            to: "/book",
            icon: CalendarDays,
            title: "Plan your visit",
            text: "Check booking availability",
          },
          {
            to: "/appointments",
            icon: Heart,
            title: "Your appointments",
            text: "Information about your visits",
          },
        ].map(({ to, icon: Icon, title, text }) => (
          <Link key={to} to={to}>
            <span className="quick-icon">
              <Icon size={23} />
            </span>
            <div>
              <strong>{title}</strong>
              <span>{text}</span>
            </div>
            <ChevronRight size={16} />
          </Link>
        ))}
      </section>
      <section className="wrap section">
        <Heading
          eyebrow="EXPLORE YOUR OPTIONS"
          title="Find your next dental clinic."
          text="View clinic information, services, and dentist profiles."
        >
          <Link className="text-link" to="/clinics">
            Explore all clinics <ArrowRight size={16} />
          </Link>
        </Heading>
        <DirectoryState>
          <div className="clinic-grid">
            {clinics.slice(0, 3).map((clinic) => (
              <ClinicCard clinic={clinic} key={clinic.id} />
            ))}
          </div>
        </DirectoryState>
      </section>
      <section className="services-section">
        <div className="wrap section">
          <Heading
            eyebrow="A LITTLE CARE GOES A LONG WAY"
            title="What does your smile need?"
            text="Explore dental services and find a clinic to discuss your options."
          >
            <Link className="text-link" to="/services">
              View all services <ArrowRight size={16} />
            </Link>
          </Heading>
          <div className="service-grid">
            {treatments.map((service, index) => (
              <Link
                className="service-card"
                key={service.id}
                to={`/clinics?q=${encodeURIComponent(service.name)}`}
              >
                <span className={`service-icon icon-${index}`}>
                  <Tooth size={32} />
                </span>
                <h3>{service.name}</h3>
                <span>Find a clinic</span>
                <ArrowUpRight size={16} />
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="wrap section how-section">
        <div className="how-intro">
          <p className="eyebrow">MAKE AN INFORMED CHOICE</p>
          <h2>
            Your next visit,
            <br />
            thoughtfully planned.
          </h2>
          <p className="muted">Start with the information you need.</p>
          <Link className="text-link" to="/clinics">
            Explore clinics <ArrowRight size={16} />
          </Link>
        </div>
        <div className="steps">
          {[
            [
              "01",
              "Explore your options",
              "Browse clinic profiles and the services they offer.",
            ],
            [
              "02",
              "Understand the cost",
              "Use published clinic prices to plan an estimate. Your dentist confirms your treatment cost.",
            ],
            [
              "03",
              "Contact your clinic",
              "Discuss your care and arrange your visit directly with the clinic while online booking is unavailable.",
            ],
          ].map(([number, title, text]) => (
            <div className="how-step" key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="wrap">
        <div className="bottom-cta">
          <div>
            <p className="eyebrow">YOUR SMILE IS WORTH MAKING TIME FOR</p>
            <h2>Take the next step toward your next visit.</h2>
            <p>Explore dental clinics and learn about your options.</p>
          </div>
          <Link className="button white" to="/clinics">
            Find a clinic <ArrowUpRight size={18} />
          </Link>
          <Tooth size={220} />
        </div>
      </section>
    </>
  );
}
