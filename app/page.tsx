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

const serif = "font-[Georgia,'Times_New_Roman',serif]";
const pageWidth = "mx-auto w-[min(1040px,calc(100%-64px))] max-[760px]:w-[calc(100%-40px)]";

const features = [
  {
    image: "/zoe-assets/calendar-product.png",
    imagePosition: "object-[24%_center]",
    title: "See the whole shop at a glance",
    copy: "Give every mechanic a clear daily schedule. See each repair, customer, bicycle, status, and duration without jumping between systems.",
  },
  {
    image: "/zoe-assets/onboarding-product.png",
    imagePosition: "object-[47%_center]",
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
    colors: "bg-[#1b214f] text-white",
  },
  {
    icon: Store,
    title: "Lightspeed\nintegration",
    copy: "Import work orders from Lightspeed Retail and keep live service details close at hand.",
    colors: "bg-[#92d7d9] text-[#1b214f]",
  },
  {
    icon: Users,
    title: "Mechanic workload\nmanagement",
    copy: "See who is available, move jobs between mechanics, and balance each day as priorities change.",
    colors: "bg-[#d8c8f2] text-[#1b214f]",
  },
  {
    icon: LayoutDashboard,
    title: "One shared\nworkspace",
    copy: "Give owners and staff a reliable view of scheduled and unscheduled repair work.",
    colors: "bg-[#f8ddca] text-[#1b214f]",
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

function Logo({ large = false }: { large?: boolean }) {
  return (
    <a
      className={`inline-flex flex-none items-center font-bold text-inherit no-underline ${serif} ${
        large ? "gap-[9px] text-[21px] max-[760px]:text-[19px]" : "gap-2 text-sm"
      }`}
      href="#top"
      aria-label="Urbane Calendar home"
    >
      <span
        className={`relative grid place-content-center rounded-full bg-[#050505] ${
          large
            ? "size-10 grid-cols-[repeat(2,5px)] gap-1 max-[760px]:size-9 max-[760px]:gap-[3px]"
            : "size-[27px] grid-cols-[repeat(2,4px)] gap-[3px]"
        }`}
      >
        {[0, 1, 2, 3].map((item) => (
          <i
            className={`rounded-[1px] bg-white ${large ? "size-[5px]" : "size-1"}`}
            key={item}
          />
        ))}
      </span>
      <span>Urbane</span>
    </a>
  );
}

function EmailForm({ className = "" }: { className?: string }) {
  return (
    <form
      className={`flex h-[34px] w-[258px] items-center rounded-[20px] bg-white py-[3px] pl-[10px] pr-[3px] shadow-[0_2px_4px_rgb(0_0_0/14%)] ${className}`}
      onSubmit={(event) => event.preventDefault()}
    >
      <Mail className="shrink-0" size={14} strokeWidth={1.7} />
      <input
        className="ml-2 min-w-0 flex-1 border-0 bg-transparent text-[10px] outline-none"
        aria-label="Email address"
        type="email"
        placeholder="Enter email address"
      />
      <button
        className="h-7 cursor-pointer whitespace-nowrap rounded-2xl border-0 bg-black px-3.5 text-[9px] text-white"
        type="submit"
      >
        Start Free
      </button>
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
    <main
      id="top"
      className="min-h-screen overflow-x-clip bg-[#faf6ea] font-[Arial,Helvetica,sans-serif] text-sm text-[#070707] [&_p]:leading-normal"
    >
      <nav
        className={`sticky top-4 z-50 mt-[18px] flex min-h-[50px] w-[min(650px,calc(100%-48px))] items-center rounded-full border px-1.5 py-[5px] pl-3 transition-[background-color,border-color,box-shadow] duration-200 max-[760px]:min-h-12 max-[760px]:justify-between max-[480px]:top-2.5 max-[480px]:w-[calc(100%-28px)] ${
          navScrolled
            ? "border-white/60 bg-white/60 shadow-[0_12px_32px_rgb(34_30_12/16%),inset_0_1px_0_rgb(255_255_255/72%)] backdrop-blur-[18px] backdrop-saturate-[1.55]"
            : "border-black/[.04] bg-white shadow-[0_10px_28px_rgb(78_64_9/14%)]"
        } mx-auto`}
        aria-label="Main navigation"
      >
        <Logo large />
        <div className="flex w-full justify-center gap-7 max-[760px]:hidden">
          <a className="text-[13px] text-inherit no-underline" href="#categories">Categories</a>
          <a className="text-[13px] text-inherit no-underline" href="#capabilities">Capabilities</a>
          <a className="text-[13px] text-inherit no-underline" href="#faq">FAQ</a>
        </div>
        <div className="flex flex-none items-center gap-[7px]">
          <a className="flex-none rounded-full bg-[#f2f2ef] px-[17px] py-3 text-xs text-[#111] no-underline max-[480px]:hidden" href="/auth/login">Login</a>
          <a className="flex-none rounded-full bg-black px-[17px] py-3 text-xs text-white no-underline" href="/auth/sign-up">Sign Up</a>
        </div>
      </nav>

      <section
        id="about"
        className="mx-auto -mt-[66px] min-h-[458px] w-[calc(100%-20px)] max-w-[1130px] rounded-[22px] bg-[radial-gradient(circle_at_78%_22%,rgb(255_255_255/58%),transparent_32%),linear-gradient(118deg,#efd9e7_0%,#f7e7ed_54%,#f9e5d6_100%)] pt-[66px] max-[760px]:min-h-0"
      >
        <div className="mx-auto grid min-h-[420px] w-[min(990px,calc(100%-48px))] grid-cols-[310px_1fr] items-center gap-12 pt-9 max-[760px]:grid-cols-1 max-[760px]:gap-[30px] max-[760px]:py-[85px] max-[760px]:text-center">
          <div className="self-center">
            <span className="mb-[13px] block text-[10px] font-bold uppercase tracking-[.08em] text-[#655d28]">Service scheduling for modern bike shops</span>
            <h1 className={`mb-4 text-[40px] leading-none tracking-[-1.5px] max-[480px]:text-[34px] ${serif}`}>
              Your workshop,<br /><em className="font-inherit">running on time.</em>{" "}
              <span className="ml-1 inline-grid size-[30px] translate-y-[-5px] place-items-center rounded-full bg-gradient-to-br from-[#ffb36d] to-[#ff7552] font-[Arial,sans-serif] text-base text-white shadow-[0_0_0_5px_rgb(255_255_255/20%)]">✦</span>
            </h1>
            <p className="mb-4 max-w-[315px] text-xs max-[760px]:mx-auto">Turn Lightspeed work orders into a clear, shared service schedule. Assign repairs, balance mechanic workloads, and keep every job moving.</p>
            <EmailForm className="max-[760px]:mx-auto" />
          </div>
          <div className="rotate-[1.2deg] overflow-hidden rounded-[18px] border-[7px] border-white/70 bg-white shadow-[0_22px_40px_rgb(66_56_12/20%)] max-[760px]:mx-auto max-[760px]:w-[min(620px,100%)] max-[760px]:rotate-0">
            <Image className="block h-auto w-full" src="/zoe-assets/calendar-product.png" alt="Service calendar showing scheduled work across a team" width={1110} height={673} priority />
          </div>
        </div>
      </section>

      <section id="categories" className={`${pageWidth} pt-[77px]`}>
        <div className="mx-auto mb-[30px] max-w-[520px] text-center">
          <span className="inline-flex items-center gap-2 text-[11px]"><Heart className="text-[#ff9262]" size={14} fill="currentColor" /> How it works</span>
          <h2 className={`my-2.5 mb-3.5 text-[29px] leading-none ${serif}`}>From work order to <em className="font-inherit">workday</em></h2>
          <p className="m-0 text-[11px]">Bring service work into one visual schedule so your front desk, mechanics, and customers always know what comes next.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1">
          {features.map((feature) => (
            <article className="min-h-[320px] rounded-3xl bg-white px-[34px] pb-5 pt-[22px] text-center" key={feature.title}>
              {feature.image ? (
                <Image className={`h-[185px] w-full rounded-[13px] object-cover shadow-[0_10px_24px_rgb(32_29_19/10%)] ${feature.imagePosition}`} src={feature.image} alt="" width={600} height={360} />
              ) : feature.icon ? (
                <div className="grid h-[185px] w-full place-items-center rounded-[13px] bg-[radial-gradient(circle_at_center,rgb(255_141_78/33%),transparent_36%),#f7e7ed] text-[#171717]"><feature.icon size={56} strokeWidth={1.35} /></div>
              ) : null}
              <h3 className={`mb-2.5 mt-0.5 text-[15px] ${serif}`}>{feature.title}</h3>
              <p className="mx-auto max-w-[310px] text-[11px]">{feature.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="capabilities" className={`${pageWidth} pt-[74px]`}>
        <div className="mx-auto mb-[27px] max-w-[520px] text-center">
          <h2 className={`mb-3 text-[29px] leading-none ${serif}`}>Everything your service desk needs</h2>
          <p className="text-[11px]">Less time coordinating repairs. More time getting bikes back to their riders.</p>
        </div>
        <div className="grid grid-cols-4 gap-[11px] max-[760px]:grid-cols-2 max-[480px]:grid-cols-1">
          {capabilities.map(({ icon: Icon, ...item }) => (
            <article className={`flex min-h-72 flex-col justify-between rounded-2xl px-4 pb-4 pt-5 ${item.colors}`} key={item.title}>
              <Icon size={52} strokeWidth={1.25} />
              <div>
                <h3 className={`mb-2.5 text-base leading-[1.1] ${serif}`}>{item.title.split("\n").map((line) => <span key={line}>{line}<br /></span>)}</h3>
                <p className="text-[11px] leading-[1.45]">{item.copy}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="faq" className={`${pageWidth} grid grid-cols-[280px_1fr] gap-[85px] pt-[78px] max-[760px]:grid-cols-1 max-[760px]:gap-[30px]`}>
        <div className="max-[760px]:text-center">
          <span className="inline-flex items-center gap-2 text-[11px]"><Heart className="text-[#ff9262]" size={14} fill="currentColor" /> FAQ</span>
          <h2 className={`mb-4 mt-[13px] text-[29px] leading-[.95] ${serif}`}>We’ve got<br />the <em className="font-inherit">answers</em></h2>
          <p className="max-w-[220px] text-[11px] max-[760px]:mx-auto">Everything you need to know before bringing your workshop schedule into Urbane.</p>
        </div>
        <div className="flex flex-col gap-[9px]">
          {faqs.map((faq, index) => {
            const open = openFaq === index;
            return (
              <article className={`overflow-hidden rounded-[14px] shadow-[0_5px_14px_rgb(99_75_27/5%)] ${open ? "bg-[#050505] text-white" : "bg-white"}`} key={faq.q}>
                <button className={`flex w-full cursor-pointer items-center justify-between border-0 bg-transparent px-5 py-4 text-left text-[15px] font-semibold text-inherit ${serif}`} onClick={() => setOpenFaq(open ? -1 : index)} aria-expanded={open}>
                  <span>{faq.q}</span>
                  <span className="box-content flex-none rounded-full bg-[#f8f8f8] p-0.5 text-[#111]">{open ? <ArrowUp size={14} /> : <ChevronDown size={14} />}</span>
                </button>
                {open && <p className="-mt-[5px] mb-[19px] ml-5 mr-5 max-w-[390px] whitespace-pre-line text-[10px]">{faq.a}</p>}
              </article>
            );
          })}
        </div>
      </section>

      <section id="access" className={`${pageWidth} mt-[78px] rounded-[18px] bg-[linear-gradient(118deg,#efd9e7,#f9e5d6)] px-5 pb-11 pt-[51px] text-center`}>
        <h2 className={`mb-2 text-[25px] leading-[1.1] ${serif}`}>Build a calmer,<br /><em className="font-inherit">more productive workshop.</em></h2>
        <p className="mb-[22px] text-[11px]">Start organizing your service day in minutes.</p>
        <EmailForm className="mx-auto" />
      </section>

      <footer className={`${pageWidth} pb-3.5 pt-[39px]`}>
        <div className="flex items-center justify-between max-[480px]:flex-col max-[480px]:items-start max-[480px]:gap-[22px]">
          <Logo />
          <nav className="flex gap-[30px] text-[10px] max-[480px]:flex-wrap max-[480px]:gap-x-6 max-[480px]:gap-y-4">
            <a className="text-inherit no-underline" href="#categories">How it works</a><a className="text-inherit no-underline" href="#capabilities">Capabilities</a><a className="text-inherit no-underline" href="#faq">FAQ</a><a className="text-inherit no-underline" href="/auth/login">Login</a><a className="text-inherit no-underline" href="/auth/sign-up">Sign Up</a>
          </nav>
        </div>
        <div className="mt-7 flex items-center justify-between border-t border-[#eee8d8] pt-5 text-[9px] max-[480px]:flex-col max-[480px]:items-start max-[480px]:gap-[22px]">
          <span>Copyright © 2026 Urbane Calendar. All rights reserved.</span>
          <div className="flex gap-[34px]"><a className="text-inherit underline" href="#">Terms &amp; Conditions</a><a className="text-inherit underline" href="#">Privacy Policy</a></div>
        </div>
      </footer>
    </main>
  );
}
