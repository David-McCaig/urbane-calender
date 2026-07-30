import { AccessSection } from "./access-section";
import { CapabilitiesSection } from "./capabilities-section";
import { FaqSection } from "./faq-section";
import { FeaturesSection } from "./features-section";
import { Footer } from "./footer";
import { HeroSection } from "./hero-section";
import { Navbar } from "./navbar";

export function LandingPage() {
  return (
    <main
      id="top"
      className="min-h-screen overflow-x-clip bg-[#faf6ea] font-[Arial,Helvetica,sans-serif] text-sm text-[#070707] [&_p]:leading-normal"
    >
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <CapabilitiesSection />
      <FaqSection />
      <AccessSection />
      <Footer />
    </main>
  );
}
