import { Preloader } from "@/components/layout/Preloader";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { Manifesto } from "@/components/sections/Manifesto";
import { Categories } from "@/components/sections/Categories";
import { QuickView } from "@/components/commerce/QuickView";
import { CartDrawer } from "@/components/commerce/CartDrawer";

export default function Home() {
  return (
    <>
      <Preloader />
      <Header />
      <main>
        <Hero />
        <Manifesto />
        <Categories />
      </main>
      <Footer />
      <QuickView />
      <CartDrawer />
    </>
  );
}
