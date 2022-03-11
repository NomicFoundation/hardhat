import type { NextPage } from "next";
import LandingLayout from "../components/LandingLayout";
import HeroBlock from "../components/landingBlocks/HeroBlock";

const Home: NextPage = () => {
  return (
    <LandingLayout seo={{ title: "Hardhat" }}>
      <HeroBlock />
      <HeroBlock />
      <HeroBlock />
      {/* <HeroBlock />
      <HeroBlock />
      <HeroBlock />
      <HeroBlock />
      <HeroBlock /> */}
    </LandingLayout>
  );
};

export default Home;
