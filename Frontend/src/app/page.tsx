import Header from "@/components/Header";
import Hero from "@/components/Hero";
import CatalogGrid from "@/components/CatalogGrid";
import Contacts from "@/components/Contacts";
import Footer from "@/components/Footer";
import RevealSection from "@/components/RevealSection";
import { getCatalogCars } from "@/data/cars";

export const revalidate = 900;

const HomePage = async () => {
  const catalogCars = await getCatalogCars();

  return (
    <>
      <Header />
      <main>
        <Hero />
        <CatalogGrid cars={catalogCars} />
        <RevealSection><Contacts /></RevealSection>
      </main>
      <Footer />
    </>
  );
};

export default HomePage;
