import type { NextPage } from "next";

import HeroBlock from "../components/landingBlocks/HeroBlock";
import FeatureCard from "../components/ui/FeatureCard";
import GetStartedHardhat from "../components/landingBlocks/CTABlock";
import WhyHardhatBlock from "../components/landingBlocks/WhyHardhatBlock";
import VibrantCommunityBlock from "../components/landingBlocks/VibrantCommunityBlock";
import TrustedTeamsBlock from "../components/landingBlocks/TrustedTeamsBlock";
import BuiltByBlock from "../components/landingBlocks/BuiltByBlock";
import ReviewsBlock from "../components/landingBlocks/ReviewsBlock";
import ToolsBlock from "../components/landingBlocks/ToolsBlock";
import homepageContent from "../content/home";

const Home: NextPage = () => {
  return (
    <>
      <HeroBlock content={homepageContent.heroBlockContent} />
      <ToolsBlock content={homepageContent.toolsBlockContent} />
      <WhyHardhatBlock content={homepageContent.whyHardhatContent}>
        <FeatureCard
          content={homepageContent.featureCardsContent.featureCardOne}
          isReversed
        />
        <FeatureCard
          content={homepageContent.featureCardsContent.featureCardTwo}
        />
        <FeatureCard
          content={homepageContent.featureCardsContent.featureCardThree}
          isReversed
        />
        <FeatureCard
          content={homepageContent.featureCardsContent.featureCardFour}
        />
      </WhyHardhatBlock>
      <VibrantCommunityBlock
        content={homepageContent.vibrantCommunityBlockContent}
      />
      <GetStartedHardhat content={homepageContent.getStartedHardhat} />
      <TrustedTeamsBlock content={homepageContent.trustedTeamsBlockContent} />
      <ReviewsBlock content={homepageContent.reviewsBlockContent} />
      <BuiltByBlock content={homepageContent.builtByBlockContent} />
    </>
  );
};

/* @ts-ignore */
Home.layout = "landing";
export default Home;
