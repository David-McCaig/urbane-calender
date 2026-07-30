import Image from "next/image";
import { Heart } from "lucide-react";
import { features } from "./content";
import { pageWidth, serif } from "./styles";

export function FeaturesSection() {
  return (
    <section id="categories" className={`${pageWidth} pt-[77px]`}>
      <div className="mx-auto mb-[30px] max-w-[520px] text-center">
        <span className="inline-flex items-center gap-2 text-[11px]">
          <Heart className="text-[#ff9262]" size={14} fill="currentColor" /> How
          it works
        </span>
        <h2 className={`my-2.5 mb-3.5 text-[29px] leading-none ${serif}`}>
          From work order to <em className="font-inherit">workday</em>
        </h2>
        <p className="m-0 text-[11px]">
          Bring service work into one visual schedule so your front desk,
          mechanics, and customers always know what comes next.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1">
        {features.map((feature) => (
          <article
            className="min-h-[320px] rounded-3xl bg-white px-[34px] pb-5 pt-[22px] text-center"
            key={feature.title}
          >
            {feature.image ? (
              <Image
                className={`h-[185px] w-full rounded-[13px] object-cover shadow-[0_10px_24px_rgb(32_29_19/10%)] ${feature.imagePosition}`}
                src={feature.image}
                alt=""
                width={600}
                height={360}
              />
            ) : feature.icon ? (
              <div className="grid h-[185px] w-full place-items-center rounded-[13px] bg-[radial-gradient(circle_at_center,rgb(255_141_78/33%),transparent_36%),#f7e7ed] text-[#171717]">
                <feature.icon size={56} strokeWidth={1.35} />
              </div>
            ) : null}
            <h3 className={`mb-2.5 mt-0.5 text-[15px] ${serif}`}>
              {feature.title}
            </h3>
            <p className="mx-auto max-w-[310px] text-[11px]">{feature.copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
