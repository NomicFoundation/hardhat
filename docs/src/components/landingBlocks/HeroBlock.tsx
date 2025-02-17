import React from "react";
import { styled } from "linaria/react";
import Image from "next/image";
import Section from "../Section";
import CTA from "../ui/CTA";
import { media, tm, tmDark, tmSelectors } from "../../themes";
import { CTAType } from "../ui/types";

import LandingContainer from "../LandingContainer";
import heroGraphicDesktop from "../../assets/hero/hero.svg";

interface Props {
  content: {
    title: string;
    tagline: string;
    cta: CTAType;
  };
}

const Container = styled.div`
  width: 100%;
  padding: 95px 0 148px;
  text-align: center;
  color: ${tm(({ colors }) => colors.base100)};

  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.base100)};
  }

  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.base100)};
    }
  }
`;

const Content = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
  padding-top: 60px;
  max-width: 840px;
  margin: 0 auto;
  min-height: 900px;
  position: relative;
  z-index: 1;
`;

const GraphicContainer = styled.div`
  height: 100%;
  position: absolute;
  top: 0;
  left: 50%;
  width: 1832px;
  pointer-events: none;
  transform: translateX(-50%);
  z-index: -1;
`;

const TagLine = styled.span`
  font-family: SourceCodePro, sans-serif;

  font-size: 31px;
  line-height: 1.4;
  letter-spacing: 0.05em;
`;

const Title = styled.h1`
  font-size: 95px;
  line-height: 1;
  letter-spacing: 0.02em;
  font-family: Roboto, sans-serif;
  font-weight: 700;
`;

const Block = styled.div`
  margin-top: 94px;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 20px 54px;
`;

const BlockTitle = styled.h2`
  font-size: 31px;
  line-height: 1.35;
  letter-spacing: 0.05em;
  font-family: SourceCodePro, sans-serif;
  font-weight: 600;
  max-width: 300px;
`;

const BlockText = styled.p`
  font-size: 20px;
  line-height: 1.45;
  letter-spacing: 0.05em;
  font-family: Roboto, sans-serif;
  max-width: 540px;
  color: ${tm(({ colors }) => colors.base400)};

  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.base400)};
  }

  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.base400)};
    }
  }
`;

const HeroBlock = ({ content }: Props) => {
  return (
    <Section clearPadding>
      <Container>
        <LandingContainer>
          <Content>
            <TagLine dangerouslySetInnerHTML={{ __html: content.tagline }} />
            <Title>{content.title}</Title>

            <CTA href={content.cta.url} variant="md">
              {content.cta.title}
            </CTA>
            <GraphicContainer>
              <Image
                src={heroGraphicDesktop}
                alt="ethereum logo dark"
                className="light"
                width={1832}
                height={900}
              />
            </GraphicContainer>
          </Content>

          <Block>
            <BlockTitle>Ready to use out of the box</BlockTitle>
            <BlockText>
              Hardhat includes everything you need for Solidity smart contract
              development. Testing, deployment, gas analysis, code coverage,
              code verification, and more.
            </BlockText>
          </Block>
        </LandingContainer>
      </Container>
    </Section>
  );
};

export default HeroBlock;
