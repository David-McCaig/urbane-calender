import { serif } from "./styles";

export function Logo({ large = false }: { large?: boolean }) {
  return (
    <a
      className={`inline-flex flex-none items-center font-bold text-inherit no-underline ${serif} ${
        large
          ? "gap-[9px] text-[21px] max-[760px]:text-[19px]"
          : "gap-2 text-sm"
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
            className={`rounded-[1px] bg-white ${
              large ? "size-[5px]" : "size-1"
            }`}
            key={item}
          />
        ))}
      </span>
      <span>Urbane</span>
    </a>
  );
}
