import type { NextPage } from "next";
import HeroBlock from "../components/landingBlocks/HeroBlock";
import WhyHardhatBlock from "../components/landingBlocks/WhyHardhatBlock";

import EmailForm from "../components/landingBlocks/EmailForm";
import homepageContent from "../content/home";
import LandingLayout from "../components/LandingLayout";
import WhatIsNewBlock from "../components/landingBlocks/WhatIsNewBlock";
import HardhatNews from "../components/landingBlocks/HardhatNews";

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

      <WhyHardhatBlock content={homepageContent.whyHardhatContent} />
      <WhatIsNewBlock content={homepageContent.whatIsNewBlockContent} />
      <HardhatNews content={homepageContent.hardhatNewsContent} />
      <EmailForm endpoint={homepageContent.emailFormContent.endpoint} />

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
