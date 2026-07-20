import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import WhyUs from "@/components/WhyUs";
import Contacts from "@/components/Contacts";
import Footer from "@/components/Footer";
import RevealSection from "@/components/RevealSection";

const HomePage = () => {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <RevealSection><Services /></RevealSection>
        <RevealSection><WhyUs /></RevealSection>
        <RevealSection><Contacts /></RevealSection>
      </main>
      <Footer />
    </>
  );
};

export default HomePage;
