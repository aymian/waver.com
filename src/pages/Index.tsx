import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import PageWrapper from "@/components/PageWrapper";

const Index = () => {
  return (
    <PageWrapper>
      <div className="min-h-screen bg-background text-foreground">
        <Navigation />
        <Hero />
        <Footer />
      </div>
    </PageWrapper>
  );
};

export default Index;
