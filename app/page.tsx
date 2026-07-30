"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  ArrowUp,
  CalendarDays,
  ChevronDown,
  Heart,
  LayoutDashboard,
  Mail,
  RefreshCw,
  Store,
  Users,
} from "lucide-react";

const features = [
  {
    image: "/zoe-assets/calendar-product.png",
    imageClass: "calendar-preview",
    title: "See the whole shop at a glance",
    copy: "Give every mechanic a clear daily schedule. See each repair, customer, bicycle, status, and duration without jumping between systems.",
  },
  {
    image: "/zoe-assets/onboarding-product.png",
    imageClass: "onboarding-preview",
    title: "Get your team up and running",
    copy: "Create your shop, invite the team, set up your service calendar, and connect Lightspeed through one straightforward onboarding flow.",
  },
  {
    icon: RefreshCw,
    title: "Keep work orders in sync",
    copy: "Bring current Lightspeed Retail work orders and statuses into the calendar so the service desk and workshop stay on the same page.",
  },
  {
    icon: Users,
    title: "Plan work with confidence",
    copy: "Drag repairs onto the right mechanic and time slot, rebalance the day in seconds, and keep every scheduled job visible to the team.",
  },
];

const capabilities = [
  {
    icon: CalendarDays,
    title: "Visual service\ncalendar",
    copy: "Plan every repair by mechanic, time, and duration in one clear daily workspace.",
    className: "capability black",
  },
  {
    icon: Store,
    title: "Lightspeed\nintegration",
    copy: "Import work orders from Lightspeed Retail and keep live service details close at hand.",
    className: "capability blue",
  },
  {
    icon: Users,
    title: "Mechanic workload\nmanagement",
    copy: "See who is available, move jobs between mechanics, and balance each day as priorities change.",
    className: "capability white",
  },
  {
    icon: LayoutDashboard,
    title: "One shared\nworkspace",
    copy: "Give owners and staff a reliable view of scheduled and unscheduled repair work.",
    className: "capability orange",
  },
];

const faqs = [
  {
    q: "What is Urbane Calendar built for?",
    a: "Urbane Calendar is built for bicycle shops that want a faster way to schedule service work. It turns repair work orders into a clear, mechanic-by-mechanic daily plan.",
  },
  { q: "Does it connect with Lightspeed Retail?", a: "Yes. Connect your Lightspeed Retail account to bring work orders, customer details, bicycle information, and repair statuses into the service calendar." },
  { q: "Can I schedule work across multiple mechanics?", a: "Yes. Each mechanic has a dedicated calendar column, making it easy to assign, move, and rebalance repairs throughout the day." },
  { q: "What happens to unscheduled work orders?", a: "They remain visible in the work-order panel until you drag them onto the calendar, so incoming repairs do not disappear from view." },
  { q: "Can my whole team use it?", a: "Yes. Create a shop workspace, invite staff, and keep everyone working from the same live service schedule." },
];

function Logo() {
  return (
    <a className="logo" href="#top" aria-label="Urbane Calendar home">
      <span className="logo-mark"><i /><i /><i /><i /></span>
      <span>Urbane</span>
    </a>
  );
}

function EmailForm() {
  return (
    <form className="email-form" onSubmit={(event) => event.preventDefault()}>
      <Mail size={14} strokeWidth={1.7} />
      <input aria-label="Email address" type="email" placeholder="Enter email address" />
      <button type="submit">Start Free</button>
    </form>
  );
}

export default function Home() {
  const [openFaq, setOpenFaq] = useState(0);
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const updateNav = () => setNavScrolled(window.scrollY > 8);
    updateNav();
    window.addEventListener("scroll", updateNav, { passive: true });
    return () => window.removeEventListener("scroll", updateNav);
  }, []);

  return (
    <main id="top" className="zoe-page">
      <nav className={`nav-pill ${navScrolled ? "scrolled" : ""}`} aria-label="Main navigation">
        <Logo />
        <div className="nav-links">
          <a href="#categories">Categories</a>
          <a href="#capabilities">Capabilities</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="nav-actions">
          <a className="nav-login" href="/auth/login">Login</a>
          <a className="nav-signup" href="/auth/sign-up">Sign Up</a>
        </div>
      </nav>

      <section id="about" className="hero-section">
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">Service scheduling for modern bike shops</span>
            <h1>Your workshop,<br /><em>running on time.</em> <span className="mini-sun">✦</span></h1>
            <p>Turn Lightspeed work orders into a clear, shared service schedule. Assign repairs, balance mechanic workloads, and keep every job moving.</p>
            <EmailForm />
          </div>
          <div className="hero-art-wrap">
            <Image className="hero-art" src="/zoe-assets/calendar-product.png" alt="Service calendar showing scheduled work across a team" width={1110} height={673} priority />
          </div>
        </div>
      </section>

      <section id="categories" className="why-section page-width">
        <div className="section-heading">
          <span><Heart size={14} fill="currentColor" /> How it works</span>
          <h2>From work order to <em>workday</em></h2>
          <p>Bring service work into one visual schedule so your front desk, mechanics, and customers always know what comes next.</p>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              {feature.image ? (
                <Image className={feature.imageClass} src={feature.image} alt="" width={600} height={360} />
              ) : feature.icon ? (
                <div className="feature-icon"><feature.icon size={56} strokeWidth={1.35} /></div>
              ) : null}
              <h3>{feature.title}</h3>
              <p>{feature.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="capabilities" className="capabilities-section page-width">
        <div className="section-heading compact">
          <h2>Everything your service desk needs</h2>
          <p>Less time coordinating repairs. More time getting bikes back to their riders.</p>
        </div>
        <div className="capability-grid">
          {capabilities.map(({ icon: Icon, ...item }) => (
            <article className={item.className} key={item.title}>
              <Icon size={52} strokeWidth={1.25} />
              <div>
                <h3>{item.title.split("\n").map((line) => <span key={line}>{line}<br /></span>)}</h3>
                <p>{item.copy}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="faq" className="faq-section page-width">
        <div className="faq-intro">
          <span><Heart size={14} fill="currentColor" /> FAQ</span>
          <h2>We’ve got<br />the <em>answers</em></h2>
          <p>Everything you need to know before bringing your workshop schedule into Urbane.</p>
        </div>
        <div className="accordion">
          {faqs.map((faq, index) => {
            const open = openFaq === index;
            return (
              <article className={`faq-item ${open ? "open" : ""}`} key={faq.q}>
                <button onClick={() => setOpenFaq(open ? -1 : index)} aria-expanded={open}>
                  <span>{faq.q}</span>
                  {open ? <ArrowUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {open && <p>{faq.a}</p>}
              </article>
            );
          })}
        </div>
      </section>

      <section id="access" className="access-section page-width">
        <h2>Build a calmer,<br /><em>more productive workshop.</em></h2>
        <p>Start organizing your service day in minutes.</p>
        <EmailForm />
      </section>

      <footer className="footer page-width">
        <div className="footer-top">
          <Logo />
          <nav>
            <a href="#categories">How it works</a><a href="#capabilities">Capabilities</a><a href="#faq">FAQ</a><a href="/auth/login">Login</a><a href="/auth/sign-up">Sign Up</a>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>Copyright © 2026 Urbane Calendar. All rights reserved.</span>
          <div><a href="#">Terms &amp; Conditions</a><a href="#">Privacy Policy</a></div>
        </div>
      </footer>
    </main>
  );
}
