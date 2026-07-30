import { EmailForm } from "./email-form";
import { pageWidth, serif } from "./styles";

export function AccessSection() {
  return (
    <section
      id="access"
      className={`${pageWidth} mt-[78px] rounded-[18px] bg-[linear-gradient(118deg,#efd9e7,#f9e5d6)] px-5 pb-11 pt-[51px] text-center`}
    >
      <h2 className={`mb-2 text-[25px] leading-[1.1] ${serif}`}>
        Build a calmer,
        <br />
        <em className="font-inherit">more productive workshop.</em>
      </h2>
      <p className="mb-[22px] text-[11px]">
        Start organizing your service day in minutes.
      </p>
      <EmailForm className="mx-auto" />
    </section>
  );
}
