import type { NextPage } from "next";
import LandingLayout from "../components/LandingLayout";
import HeroBlock from "../components/landingBlocks/HeroBlock";
import WhyHardhatBlock, {
  defaultWhyHardhatContent,
} from "../components/landingBlocks/WhyHardhatBlock";
import defaultProps from "../components/ui/default-props";

const { defaultHeroBlockContent } = defaultProps;
// import ToolsBlock from '../components/landingBlocks/ToolsBlock';

const Home: NextPage = () => {
  return (
    <LandingLayout seo={{ title: "Hardhat" }}>
      <HeroBlock content={defaultHeroBlockContent} />
      <WhyHardhatBlock content={defaultWhyHardhatContent} />

      {/* Required confirmation from customers */}
      {/* <ToolsBlock /> */}
    </LandingLayout>
  );
};

export default Home;
