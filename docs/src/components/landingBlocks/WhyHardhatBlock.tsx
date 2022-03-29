import React from "react";
import { styled } from "linaria/react";
import Section from "../Section";
// import FeatureCard from '../ui/FeatureCard';
import SolidityImageDesktop from "../../assets/feature-cards/Desktop/SolidityImage.png";
import SolidityImageMobile from "../../assets/feature-cards/Mobile/SolidityImage.png";
import { tm, appTheme } from "../../themes";

const { media } = appTheme;

export const defaultWhyHardhatContent = {
  title: "Why hardhat",
  featureCardOne: {
    getImgPath: (props: { isDesktop: boolean }) => {
      return props.isDesktop ? SolidityImageDesktop : SolidityImageMobile;
    },
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
};

interface Props {
  content: typeof defaultWhyHardhatContent;
}

const Container = styled.section`
  width: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${tm(({ colors }) => colors.neutral400)};
  border-left: 1px solid ${tm(({ colors }) => colors.neutral400)};
  padding-top: 52px;
  ${media.lg} {
    border-left: unset;
  }
`;

const Title = styled.h2`
  position: absolute;
  padding: 24px;
  background-color: ${tm(({ colors }) => colors.neutral0)};
  left: 0;
  top: 0;
  transform: translateY(-50%);
  text-transform: uppercase;
  font-size: 20px;
  font-style: normal;
  font-weight: 400;
  line-height: 24px;
  letter-spacing: 0.2em;
  ${media.lg} {
    left: 50%;
    transform: translate(-50%, -50%);
  }
`;

const WhyHardhatBlock = ({ content }: Props) => {
  return (
    <Section>
      <Container>
        <Title>{content.title}</Title>
        {/* <FeatureCard content={content.featureCardOne} isReversed={true} /> */}
      </Container>
    </Section>
  );
};

export default WhyHardhatBlock;
