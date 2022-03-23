import type { NextPage } from 'next';
import LandingLayout from '../components/LandingLayout';
import HeroBlock from '../components/landingBlocks/HeroBlock';
import WhyHardhatBlock from '../components/landingBlocks/WhyHardhatBlock';

const Home: NextPage = () => {
  return (
    <LandingLayout seo={{ title: 'Hardhat' }}>
      <WhyHardhatBlock />
    </LandingLayout>
  );
};

export default Home;
