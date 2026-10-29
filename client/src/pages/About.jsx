import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Plus, Minus } from "lucide-react";
import { Heading, PageTitle } from "../components/Shared";

export default function About() {
  const [open, setOpen] = useState(0);
  return (
    <div className="wrap page">
      <PageTitle
        eyebrow="A BETTER WAY TO PLAN YOUR CARE"
        title="Dental care, with a little more clarity."
        text="Find information to help you choose your next dental clinic."
      />
      <div className="about-grid">
        <img
          src="/images/clinic-1.jpg"
          alt="Dental equipment in a bright treatment room"
        />
        <div>
          <h2>
            Book your smile.
            <br />
            Know your cost.
          </h2>
          <p className="muted">
            DentaBook helps you explore clinic profiles, learn about available
            services, and use published clinic prices to plan your treatment
            budget.
          </p>
          <p className="muted">
            We are building online appointment requests and clinic management
            step by step. For now, contact a listed clinic directly to arrange
            your visit.
          </p>
          <Link className="button" to="/clinics">
            Find a clinic <ArrowRight size={17} />
          </Link>
        </div>
      </div>
      <section className="faq">
        <Heading
          eyebrow="A FEW THINGS YOU MIGHT BE WONDERING"
          title="Let’s clear that up."
        />
        {[
          [
            "Is my estimate the final treatment price?",
            "Published service prices help you plan. Your dentist confirms the final treatment and cost after an assessment.",
          ],
          [
            "Do I need an account to browse?",
            "You can browse clinics, dentist information, services, and estimates without signing in. A patient account is required for booking and personal appointment features. Online booking submission is still being built.",
          ],
          [
            "Can I book an appointment online?",
            "Online booking is not available yet. Use the contact details on a clinic profile to discuss availability and arrange a visit.",
          ],
          [
            "Where does the clinic information come from?",
            "The directory displays approved clinic records and their published services and dentist profiles.",
          ],
          [
            "Why are there no clinics in my search?",
            "A clinic may not be listed yet, or your filters may be too specific. Try another location or clear your filters.",
          ],
        ].map(([question, answer], index) => (
          <div className="faq-item" key={question}>
            <button
              aria-expanded={open === index}
              onClick={() => setOpen(open === index ? -1 : index)}
            >
              {question}
              {open === index ? <Minus size={18} /> : <Plus size={18} />}
            </button>
            {open === index && <p>{answer}</p>}
          </div>
        ))}
      </section>
    </div>
  );
}
