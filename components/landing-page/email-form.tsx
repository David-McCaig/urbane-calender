"use client";

import { Mail } from "lucide-react";

export function EmailForm({ className = "" }: { className?: string }) {
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
