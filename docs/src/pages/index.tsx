import type { NextPage } from "next";
import HeroBlock from "../components/landingBlocks/HeroBlock";
import FeatureCard from "../components/ui/FeatureCard";
import GetStartedBlock from "../components/landingBlocks/GetStartedBlock";
import WhyHardhatBlock from "../components/landingBlocks/WhyHardhatBlock";
import VibrantCommunityBlock from "../components/landingBlocks/VibrantCommunityBlock";
import TrustedTeamsBlock from "../components/landingBlocks/TrustedTeamsBlock";
import BuiltByBlock from "../components/landingBlocks/BuiltByBlock";
import ReviewsBlock from "../components/landingBlocks/ReviewsBlock";
import ToolsBlock from "../components/landingBlocks/ToolsBlock";
import homepageContent from "../content/home";
import LandingLayout from "../components/LandingLayout";
import WhatIsNewBlock from "../components/landingBlocks/WhatIsNewBlock";

const Home: NextPage = () => {
  return (
    <LandingLayout
      seo={{
        title: "Hardhat",
        description:
          "Hardhat is an Ethereum development environment. Compile your contracts and run them on a development network. Get Solidity stack traces, console.log and more.",
      }}
      sidebarLayout={[]}
    >
      <HeroBlock content={homepageContent.heroBlockContent} />

      {/* <ToolsBlock content={homepageContent.toolsBlockContent} /> */}

      <WhyHardhatBlock content={homepageContent.whyHardhatContent}>
        <FeatureCard
          content={homepageContent.featureCardsContent.featureCardOne}
        />
        <FeatureCard
          content={homepageContent.featureCardsContent.featureCardTwo}
        />
        <FeatureCard
          content={homepageContent.featureCardsContent.featureCardThree}
        />
        <FeatureCard
          content={homepageContent.featureCardsContent.featureCardFour}
        />
      </WhyHardhatBlock>
      <WhatIsNewBlock content={homepageContent.whatIsNewBlockContent} />

      {/* <VibrantCommunityBlock
        content={homepageContent.vibrantCommunityBlockContent}
      />
      <GetStartedBlock content={homepageContent.getStartedBlockContent} />
      <TrustedTeamsBlock content={homepageContent.trustedTeamsBlockContent} />
      <ReviewsBlock content={homepageContent.reviewsBlockContent} />
      <BuiltByBlock content={homepageContent.builtByBlockContent} /> */}
    </LandingLayout>
  );
};

export default Home;
