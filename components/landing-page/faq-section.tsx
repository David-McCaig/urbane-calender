"use client";

import { useState } from "react";
import { ArrowUp, ChevronDown, Heart } from "lucide-react";
import { faqs } from "./content";
import { pageWidth, serif } from "./styles";

export function FaqSection() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <section
      id="faq"
      className={`${pageWidth} grid grid-cols-[280px_1fr] gap-[85px] pt-[78px] max-[760px]:grid-cols-1 max-[760px]:gap-[30px]`}
    >
      <div className="max-[760px]:text-center">
        <span className="inline-flex items-center gap-2 text-[11px]">
          <Heart className="text-[#ff9262]" size={14} fill="currentColor" /> FAQ
        </span>
        <h2 className={`mb-4 mt-[13px] text-[29px] leading-[.95] ${serif}`}>
          We’ve got
          <br />
          the <em className="font-inherit">answers</em>
        </h2>
        <p className="max-w-[220px] text-[11px] max-[760px]:mx-auto">
          Everything you need to know before bringing your workshop schedule
          into Urbane.
        </p>
      </div>
      <div className="flex flex-col gap-[9px]">
        {faqs.map((faq, index) => {
          const open = openFaq === index;
          return (
            <article
              className={`overflow-hidden rounded-[14px] shadow-[0_5px_14px_rgb(99_75_27/5%)] ${
                open ? "bg-[#050505] text-white" : "bg-white"
              }`}
              key={faq.q}
            >
              <button
                className={`flex w-full cursor-pointer items-center justify-between border-0 bg-transparent px-5 py-4 text-left text-[15px] font-semibold text-inherit ${serif}`}
                onClick={() => setOpenFaq(open ? -1 : index)}
                aria-expanded={open}
              >
                <span>{faq.q}</span>
                <span className="box-content flex-none rounded-full bg-[#f8f8f8] p-0.5 text-[#111]">
                  {open ? <ArrowUp size={14} /> : <ChevronDown size={14} />}
                </span>
              </button>
              {open && (
                <p className="-mt-[5px] mb-[19px] ml-5 mr-5 max-w-[390px] whitespace-pre-line text-[10px]">
                  {faq.a}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
