import { Logo } from "./logo";
import { pageWidth } from "./styles";

export function Footer() {
  return (
    <footer className={`${pageWidth} pb-3.5 pt-[39px]`}>
      <div className="flex items-center justify-between max-[480px]:flex-col max-[480px]:items-start max-[480px]:gap-[22px]">
        <Logo />
        <nav className="flex gap-[30px] text-[10px] max-[480px]:flex-wrap max-[480px]:gap-x-6 max-[480px]:gap-y-4">
          <a className="text-inherit no-underline" href="#categories">
            How it works
          </a>
          <a className="text-inherit no-underline" href="#capabilities">
            Capabilities
          </a>
          <a className="text-inherit no-underline" href="#faq">
            FAQ
          </a>
          <a className="text-inherit no-underline" href="/auth/login">
            Login
          </a>
          <a className="text-inherit no-underline" href="/auth/sign-up">
            Sign Up
          </a>
        </nav>
      </div>
      <div className="mt-7 flex items-center justify-between border-t border-[#eee8d8] pt-5 text-[9px] max-[480px]:flex-col max-[480px]:items-start max-[480px]:gap-[22px]">
        <span>Copyright © 2026 Urbane Calendar. All rights reserved.</span>
        <div className="flex gap-[34px]">
          <a className="text-inherit underline" href="#">
            Terms &amp; Conditions
          </a>
          <a className="text-inherit underline" href="#">
            Privacy Policy
          </a>
        </div>
      </div>
    </footer>
  );
}
