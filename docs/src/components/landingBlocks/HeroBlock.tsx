import React from "react";
import { styled } from "linaria/react";
import Image from "next/image";
import Section from "../Section";
import CTA from "../ui/CTA";
import { media, tm, tmDark, tmSelectors } from "../../themes";
import { CTAType } from "../ui/types";

import LandingContainer from "../LandingContainer";
import heroGraphicDesktop from "../../assets/hero/hero.png";
import heroGraphicTablet from "../../assets/hero/heroTablet.png";
import heroGraphicMobile from "../../assets/hero/heroMobile.png";

import heroGraphicDesktopDark from "../../assets/hero/heroDark.png";
import heroGraphicDarkTablet from "../../assets/hero/heroDarkTablet.png";
import heroGraphicDarkMobile from "../../assets/hero/heroDarkMobile.png";

import heroTexture from "../../assets/hero/hero-texture.svg";
import heroDarkTexture from "../../assets/hero/heroDark-texture.svg";

import useWindowSize from "../../hooks/useWindowSize";

interface Props {
  content: {
    title: string;
    tagline: string;
    cta: CTAType;
  };
}

const Container = styled.div<{ bgImage: string; bgImageDark: string }>`
  width: 100%;
  padding: 28px 0 95px;
  text-align: center;
  position: relative;
  z-index: 1;

  color: ${tm(({ colors }) => colors.gray8b)};

  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.gray8b)};
    &:before {
      background-image: ${(props) => `url(${props.bgImageDark})`};
    }
  }

  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.gray8b)};
      &:before {
        background-image: ${(props) => `url(${props.bgImageDark})`};
      }
    }
  }
  ${media.tablet} {
    padding: 70px 0 20px;
    &:before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: ${(props) => `url(${props.bgImage})`};
      background-size: auto 100%;
      background-position: top center;
      z-index: -1;
      pointer-events: none;
    }
  }
  ${media.desktop} {
    padding: 102px 0 148px;
    &:before {
      top: 40px;
    }
  }
`;

const Content = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
  max-width: 520px;
  margin: 0 auto;
  margin-bottom: 425px;
  a.lg {
    height: 42px;
    font-size: 12px;
    padding-left: 20px;
    padding-right: 20px;
  }
  ${media.tablet} {
    gap: 32px;
    margin-bottom: 206px;
    a.lg {
      height: 44px;
      padding-left: 28px;
      padding-right: 28px;
    }
  }
  ${media.laptop} {
    padding-top: 60px;
    max-width: 730px;
    gap: 40px;
    margin-bottom: 373px;

    a.lg {
      font-size: 16px;
    }
  }
  ${media.desktop} {
    max-width: 840px;
  }
`;

const GraphicContainer = styled.div`
  height: auto;
  position: absolute;
  top: -33px;
  left: 50%;
  width: 993px;
  pointer-events: none;
  transform: translateX(-50%);
  z-index: -1;

  &.dark {
    display: none;
  }
  ${tmSelectors.dark} {
    &.dark {
      display: flex;
    }
    &.light {
      display: none;
    }
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      &.dark {
        display: flex;
      }
      &.light {
        display: none;
      }
    }
  }
  ${media.tablet} {
    top: 22px;
    width: 1165px;
  }
  ${media.laptop} {
    top: 15px;
    width: 1743px;
  }
  ${media.desktop} {
    top: 96px;
    width: 1831px;
  }
`;

const TagLine = styled.span`
  font-family: SourceCodePro, sans-serif;
  font-size: 16px;
  line-height: 1.4;
  letter-spacing: 0.05em;

  strong {
    display: block;
    font-size: 18px;
    margin-bottom: 4px;
  }
  ${media.tablet} {
    font-size: 20px;
    strong {
      display: inline;
      font-size: inherit;
    }
  }
  ${media.laptop} {
    font-size: 25px;
  }
  ${media.desktop} {
    font-size: 31px;
  }
`;

const Title = styled.h1`
  font-size: 39px;
  line-height: 1;
  letter-spacing: 0.045em;
  font-family: Roboto, sans-serif;
  font-weight: 700;
  ${media.tablet} {
    font-size: 61px;
  }
  ${media.laptop} {
    font-size: 76px;
  }
  ${media.desktop} {
    font-size: 95px;
    letter-spacing: 0.02em;
  }
`;

const Block = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px 24px;
  text-align: center;
  ${media.tablet} {
    align-items: center;
    flex-direction: row;
    text-align: left;
  }
  ${media.laptop} {
    gap: 20px 45px;
  }
`;

const BlockTitle = styled.h2`
  font-size: 18px;
  line-height: 1.35;
  letter-spacing: 0.05em;
  font-family: SourceCodePro, sans-serif;
  font-weight: 600;
  max-width: 180px;
  margin: 0 auto;
  flex: none;
  &:after {
    content: "_";
    display: inline;
    color: #edcf00;
  }
  ${media.tablet} {
    margin: 0;
    font-size: 20px;
    max-width: 200px;
  }
  ${media.laptop} {
    font-size: 25px;
    max-width: 245px;
  }
  ${media.desktop} {
    font-size: 31px;
    max-width: 310px;
  }
`;

const BlockText = styled.p`
  font-size: 14px;
  line-height: 1.45;
  letter-spacing: 0.05em;
  font-family: Roboto, sans-serif;
  max-width: 470px;
  color: ${tm(({ colors }) => colors.gray7)};

  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.gray7)};
  }

  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.gray7)};
    }
  }
  ${media.tablet} {
    font-size: 16px;
  }
  ${media.laptop} {
    font-size: 18px;
    max-width: 540px;
  }
  ${media.desktop} {
    font-size: 20px;
  }
`;

const HeroBlock = ({ content }: Props) => {
  const { width } = useWindowSize();

  let imageSrc;
  let imageDarkSrc;
  if (width > 1279) {
    imageSrc = heroGraphicDesktop;
    imageDarkSrc = heroGraphicDesktopDark;
  } else if (width < 768) {
    imageSrc = heroGraphicMobile;
    imageDarkSrc = heroGraphicDarkMobile;
  } else {
    imageSrc = heroGraphicTablet;
    imageDarkSrc = heroGraphicDarkTablet;
  }

  return (
    <Section clearPadding>
      <Container bgImage={heroTexture.src} bgImageDark={heroDarkTexture.src}>
        <LandingContainer>
          <Content>
            <TagLine dangerouslySetInnerHTML={{ __html: content.tagline }} />
            <Title>{content.title}</Title>

            <CTA href={content.cta.url} variant="lg">
              {content.cta.title}
            </CTA>
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
        <GraphicContainer className="light">
          <Image
            src={imageSrc}
            alt=""
            role="presentation"
            quality={100}
            layout="intrinsic"
            priority
          />
        </GraphicContainer>
        <GraphicContainer className="dark">
          <Image
            src={imageDarkSrc}
            alt=""
            role="presentation"
            quality={100}
            layout="intrinsic"
            priority
          />
        </GraphicContainer>
      </Container>
    </Section>
  );
};

export default HeroBlock;
