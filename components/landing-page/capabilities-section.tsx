import { capabilities } from "./content";
import { pageWidth, serif } from "./styles";

export function CapabilitiesSection() {
  return (
    <section id="capabilities" className={`${pageWidth} pt-[74px]`}>
      <div className="mx-auto mb-[27px] max-w-[520px] text-center">
        <h2 className={`mb-3 text-[29px] leading-none ${serif}`}>
          Everything your service desk needs
        </h2>
        <p className="text-[11px]">
          Less time coordinating repairs. More time getting bikes back to their
          riders.
        </p>
      </div>
      <div className="grid grid-cols-4 gap-[11px] max-[760px]:grid-cols-2 max-[480px]:grid-cols-1">
        {capabilities.map(({ icon: Icon, ...item }) => (
          <article
            className={`flex min-h-72 flex-col justify-between rounded-2xl px-4 pb-4 pt-5 ${item.colors}`}
            key={item.title}
          >
            <Icon size={52} strokeWidth={1.25} />
            <div>
              <h3 className={`mb-2.5 text-base leading-[1.1] ${serif}`}>
                {item.title.split("\n").map((line) => (
                  <span key={line}>
                    {line}
                    <br />
                  </span>
                ))}
              </h3>
              <p className="text-[11px] leading-[1.45]">{item.copy}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
