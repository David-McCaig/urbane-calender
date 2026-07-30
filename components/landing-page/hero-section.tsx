import Image from "next/image";
import { EmailForm } from "./email-form";
import { serif } from "./styles";

export function HeroSection() {
  return (
    <section
      id="about"
      className="mx-auto -mt-[66px] min-h-[458px] w-[calc(100%-20px)] max-w-[1130px] rounded-[22px] bg-[radial-gradient(circle_at_78%_22%,rgb(255_255_255/58%),transparent_32%),linear-gradient(118deg,#efd9e7_0%,#f7e7ed_54%,#f9e5d6_100%)] pt-[66px] max-[760px]:min-h-0"
    >
      <div className="mx-auto grid min-h-[420px] w-[min(990px,calc(100%-48px))] grid-cols-[310px_1fr] items-center gap-12 pt-9 max-[760px]:grid-cols-1 max-[760px]:gap-[30px] max-[760px]:py-[85px] max-[760px]:text-center">
        <div className="self-center">
          <span className="mb-[13px] block text-[10px] font-bold uppercase tracking-[.08em] text-[#655d28]">
            Service scheduling for modern bike shops
          </span>
          <h1
            className={`mb-4 text-[40px] leading-none tracking-[-1.5px] max-[480px]:text-[34px] ${serif}`}
          >
            Your workshop,
            <br />
            <em className="font-inherit">running on time.</em>{" "}
            <span className="ml-1 inline-grid size-[30px] translate-y-[-5px] place-items-center rounded-full bg-gradient-to-br from-[#ffb36d] to-[#ff7552] font-[Arial,sans-serif] text-base text-white shadow-[0_0_0_5px_rgb(255_255_255/20%)]">
              ✦
            </span>
          </h1>
          <p className="mb-4 max-w-[315px] text-xs max-[760px]:mx-auto">
            Turn Lightspeed work orders into a clear, shared service schedule.
            Assign repairs, balance mechanic workloads, and keep every job moving.
          </p>
          <EmailForm className="max-[760px]:mx-auto" />
        </div>
        <div className="rotate-[1.2deg] overflow-hidden rounded-[18px] border-[7px] border-white/70 bg-white shadow-[0_22px_40px_rgb(66_56_12/20%)] max-[760px]:mx-auto max-[760px]:w-[min(620px,100%)] max-[760px]:rotate-0">
          <Image
            className="block h-auto w-full"
            src="/zoe-assets/calendar-product.png"
            alt="Service calendar showing scheduled work across a team"
            width={1110}
            height={673}
            priority
          />
        </div>
      </div>
    </section>
  );
}
