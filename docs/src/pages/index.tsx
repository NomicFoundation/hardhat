import type { NextPage } from "next";
import LandingLayout from "../components/LandingLayout";
import HeroBlock from "../components/landingBlocks/HeroBlock";
import FeatureCard from "../components/ui/FeatureCard";
import CTABlock from "../components/landingBlocks/CTABlock";
import WhyHardhatBlock, {
  defaultWhyHardhatContent,
} from "../components/landingBlocks/WhyHardhatBlock";
import defaultProps from "../components/ui/default-props";
import VibrantCommunityBlock from "../components/landingBlocks/VibrantCommunityBlock";
import SolidityImageDesktop from "../assets/feature-cards/Desktop/SolidityImage.png";
import SolidityImageMobile from "../assets/feature-cards/Mobile/SolidityImage.png";
import FlexibilityImageDesktop from "../assets/feature-cards/Desktop/FlexibilityImage.png";
import FlexibilityImageMobile from "../assets/feature-cards/Mobile/FlexibilityImage.png";
import ExtensibleImageDesktop from "../assets/feature-cards/Desktop/ExtensibleImage.png";
import ExtensibleImageMobile from "../assets/feature-cards/Mobile/ExtensibleImage.png";
import FastIterationImageDesktop from "../assets/feature-cards/Desktop/FastIterationImage.png";
import FastIterationImageMobile from "../assets/feature-cards/Mobile/FastIterationImage.png";

const { defaultHeroBlockContent, defaultCTAContent } = defaultProps;
// import ToolsBlock from '../components/landingBlocks/ToolsBlock';

export const FeatureCards = {
  featureCardOne: {
    mobileImg: SolidityImageMobile,
    desktopImg: SolidityImageDesktop,
    cta: {
      url: "/hardhat-network/#console-log",
      title: "Get started with Solidity console.log",
    },
    articleOne: {
      title: "Run Solidity locally",
      text: "Easily deploy your contracts, run tests and debug Solidity code without dealing with live environments. Hardhat Network is a local Ethereum network designed for development.",
    },
    articleTwo: {
      title: "Debugging-first ",
      text: "Hardhat is the best choice for Solidity debugging. You get Solidity stack traces, console.log and explicit error messages when transactions fail.",
    },
  },
  featureCardTwo: {
    mobileImg: FlexibilityImageMobile,
    desktopImg: FlexibilityImageDesktop,
    cta: {
      url: "/guides/create-task.html",
      title: "Learn more about extending Hardhat",
    },
    articleOne: {
      title: "Extreme flexibility",
      text: "Change anything you like. Even entire out-of-the-box tasks, or just parts of them. Flexible and customizable design, with little constraints.",
    },
    articleTwo: {
      title: "Bring your own tools",
      text: "Designed to make integrations easy, Hardhat allows you to keep using your existing tools while enabling deeper interoperability between them.",
    },
  },
  featureCardThree: {
    mobileImg: ExtensibleImageMobile,
    desktopImg: ExtensibleImageDesktop,
    cta: { url: "/plugins", title: "Get started with plugins" },
    articleOne: {
      title: "Fully extensible",
      text: "A tooling platform designed to be extended, Hardhat has all the utilities you need to address your project-specific needs.",
    },
    articleTwo: {
      title: "Plugin ecosystem",
      text: "Extend Hardhat with a composable ecosystem of plugins that add functionality and integrate your existing tools into a smooth workflow.",
    },
  },
  featureCardFour: {
    mobileImg: FastIterationImageMobile,
    desktopImg: FastIterationImageDesktop,
    cta: {
      url: "/guides/typescript.html",
      title: "Get started with TypeScript",
    },
    articleOne: {
      title: "Fast iteration",
      text: "Keep your momentum going by making your development feedback loop up to 10x faster with Hardhat.",
    },
    articleTwo: {
      title: "TypeScript",
      text: "Catch mistakes before you even run your code by switching to a typed language. Hardhat provides full native support for TypeScript.",
    },
  },
};

const Home: NextPage = () => {
  return (
    <LandingLayout
      seo={{
        title: "Hardhat",
        description:
          "Ethereum development environment for professionals by Nomic Foundation",
      }}
    >
      <HeroBlock content={defaultHeroBlockContent} />
      <WhyHardhatBlock content={defaultWhyHardhatContent} />
      <VibrantCommunityBlock
        content={defaultProps.defaultVibrantCommunityBlockContent}
      />
      {/* Required confirmation from customers */}
      {/* <ToolsBlock /> */}
      <WhyHardhatBlock content={defaultWhyHardhatContent}>
        <FeatureCard content={FeatureCards.featureCardOne} isReversed />
        <FeatureCard content={FeatureCards.featureCardTwo} />
        <FeatureCard content={FeatureCards.featureCardThree} isReversed />
        <FeatureCard content={FeatureCards.featureCardFour} />
      </WhyHardhatBlock>
      <CTABlock content={defaultCTAContent} />
    </LandingLayout>
  );
};

export default Home;
