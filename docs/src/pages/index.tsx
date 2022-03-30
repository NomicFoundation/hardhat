import type { NextPage } from "next";
import LandingLayout from "../components/LandingLayout";
import HeroBlock from "../components/landingBlocks/HeroBlock";
import CTABlock from "../components/landingBlocks/CTABlock";
import WhyHardhatBlock, {
  defaultWhyHardhatContent,
} from "../components/landingBlocks/WhyHardhatBlock";
import defaultProps from "../components/ui/default-props";

const { defaultHeroBlockContent, defaultCTAContent } = defaultProps;
// import ToolsBlock from '../components/landingBlocks/ToolsBlock';

const Home: NextPage = () => {
  return (
    <LandingLayout seo={{ title: "Hardhat" }}>
      <HeroBlock content={defaultHeroBlockContent} />
      <WhyHardhatBlock content={defaultWhyHardhatContent} />
      <CTABlock content={defaultCTAContent} />

      {/* Required confirmation from customers */}
      {/* <ToolsBlock /> */}
    </LandingLayout>
  );
};

export default Home;
