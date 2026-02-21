import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Catalog from "@/components/Catalog";
import WhyUs from "@/components/WhyUs";
import Contacts from "@/components/Contacts";
import Footer from "@/components/Footer";

const HomePage = () => {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Services />
        <Catalog />
        <WhyUs />
        <Contacts />
      </main>
      <Footer />
    </>
  );
};

export default HomePage;
