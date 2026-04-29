import React from 'react';
import PremiumHeader from './components/PremiumHeader';
import HeroSection from './components/HeroSection';
import FeatureGrid from './components/FeatureGrid';
import Footer from './components/Footer';

function App() {
  return (
    <div className="font-sans">
      <PremiumHeader />
      <main>
        <HeroSection />
        <FeatureGrid />
      </main>
      <Footer />
    </div>
  );
}

export default App;
