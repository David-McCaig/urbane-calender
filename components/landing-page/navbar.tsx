"use client";

import { useEffect, useState } from "react";
import { Logo } from "./logo";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const updateNav = () => setScrolled(window.scrollY > 8);
    updateNav();
    window.addEventListener("scroll", updateNav, { passive: true });
    return () => window.removeEventListener("scroll", updateNav);
  }, []);

  return (
    <nav
      className={`sticky top-4 z-50 mx-auto mt-[18px] flex min-h-[50px] w-[min(650px,calc(100%-48px))] items-center rounded-full border px-1.5 py-[5px] pl-3 transition-[background-color,border-color,box-shadow] duration-200 max-[760px]:min-h-12 max-[760px]:justify-between max-[480px]:top-2.5 max-[480px]:w-[calc(100%-28px)] ${
        scrolled
          ? "border-white/60 bg-white/60 shadow-[0_12px_32px_rgb(34_30_12/16%),inset_0_1px_0_rgb(255_255_255/72%)] backdrop-blur-[18px] backdrop-saturate-[1.55]"
          : "border-black/[.04] bg-white shadow-[0_10px_28px_rgb(78_64_9/14%)]"
      }`}
      aria-label="Main navigation"
    >
      <Logo large />
      <div className="flex w-full justify-center gap-7 max-[760px]:hidden">
        <a className="text-[13px] text-inherit no-underline" href="#categories">
          Categories
        </a>
        <a className="text-[13px] text-inherit no-underline" href="#capabilities">
          Capabilities
        </a>
        <a className="text-[13px] text-inherit no-underline" href="#faq">
          FAQ
        </a>
      </div>
      <div className="flex flex-none items-center gap-[7px]">
        <a
          className="flex-none rounded-full bg-[#f2f2ef] px-[17px] py-3 text-xs text-[#111] no-underline max-[480px]:hidden"
          href="/auth/login"
        >
          Login
        </a>
        <a
          className="flex-none rounded-full bg-black px-[17px] py-3 text-xs text-white no-underline"
          href="/auth/sign-up"
        >
          Sign Up
        </a>
      </div>
    </nav>
  );
}
