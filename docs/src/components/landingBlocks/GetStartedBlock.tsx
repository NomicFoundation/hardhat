import React from "react";
import { styled } from "linaria/react";
import Image from "next/image";

import { breakpoints, media, tm, tmDark, tmSelectors } from "../../themes";
import useWindowSize from "../../hooks/useWindowSize";
import CTA from "../ui/CTA";
import Section from "../Section";
import { CTAType } from "../ui/types";
import bl from "../../assets/get-started/bl.svg";
import br from "../../assets/get-started/br.svg";

interface Props {
  content: {
    title: string;
    subtitle: string;
    cta: CTAType;
  };
}

const GetStartedBlockStyled = styled.section`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 16px;
  height: 724px;
  overflow: hidden;
  background-color: ${tm(({ colors }) => colors.neutral0)};
  position: relative;
  margin: 48px 0;
  ${media.md} {
    margin: unset;
    height: 792px;
  }
  ${tmSelectors.dark} {
    background-color: ${tmDark(({ colors }) => colors.neutral0)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-color: ${tmDark(({ colors }) => colors.neutral0)};
    }
  }
`;

const StyledBackground = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  background: ${tm(
    ({ colors }) =>
      `linear-gradient(254.24deg, ${colors.complementary600} 0%, ${colors.accent100} 100%, ${colors.accent100} 100%)`
  )};
  height: 100%;
  width: 100%;
  ${tmSelectors.dark} {
    mix-blend-mode: color-dodge;
    background: ${tmDark(
      ({ colors }) =>
        `linear-gradient(254.24deg, ${colors.complementary600} 0%, ${colors.accent100} 100%, ${colors.accent100} 100%)`
    )};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      mix-blend-mode: color-dodge;
      background: ${tmDark(
        ({ colors }) =>
          `linear-gradient(254.24deg, ${colors.complementary600} 0%, ${colors.accent100} 100%, ${colors.accent100} 100%)`
      )};
    }
  }
`;

const StyledTopGradient = styled.div`
  width: 100%;
  height: 50%;
  top: 0;
  left: 0;
  position: absolute;
  background: ${tm(({ colors }) => colors.getStartedTopBackground)};
  ${tmSelectors.dark} {
    background: ${tmDark(({ colors }) => colors.getStartedTopBackground)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      background: ${tmDark(({ colors }) => colors.getStartedTopBackground)};
    }
  }
`;

const StyledBottomGradient = styled.div`
  width: 100%;
  height: 50%;
  bottom: 0;
  left: 0;
  position: absolute;
  background: ${tm(({ colors }) => colors.getStartedBottomBackground)};
  transform: rotate(180deg);
  ${tmSelectors.dark} {
    background: ${tmDark(({ colors }) => colors.getStartedBottomBackground)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      background: ${tmDark(({ colors }) => colors.getStartedBottomBackground)};
    }
  }
`;

const TextureBrickWrapper = styled.div`
  position: absolute;
  right: 0;
  &.left {
    left: 0;
    right: auto;
  }
  ${tmSelectors.dark} {
    filter: invert(0.5);
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      filter: invert(0.5);
    }
  }
`;

const ContentBlock = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 1;
  color: ${tm(({ colors }) => colors.neutral900)};
  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral900)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.neutral900)};
    }
  }
`;

const Title = styled.h1`
  font-family: ChivoBold, sans-serif;
  font-weight: normal;
  font-size: 39px;
  line-height: 41px;
  letter-spacing: -0.01em;
  text-align: center;
  max-width: 642px;

  ${media.md} {
    font-size: 45px;
    line-height: 50px;
    letter-spacing: 0;
  }
`;

const Subtitle = styled.p`
  font-family: ChivoLight, sans-serif;
  font-size: 20px;
  line-height: 31px;
  letter-spacing: 0;
  text-align: center;
  margin-top: 24px;
  margin-bottom: 48px;
  ${media.md} {
    font-size: 24px;
    line-height: 40px;
    margin-top: 32px;
    margin-bottom: 64px;
  }
`;

const CTAWrapper = styled.div`
  filter: drop-shadow(0px 1px 2px rgba(10, 10, 10, 0.1))
    drop-shadow(0px 8px 30px rgba(184, 113, 255, 0.1));
`;

const Background = () => {
  const windowSize = useWindowSize();
  const isDesktop = breakpoints.md <= windowSize.width;
  return (
    <StyledBackground>
      {isDesktop && (
        <TextureBrickWrapper className="left">
          <Image src={bl} alt="decorations" />
        </TextureBrickWrapper>
      )}
      <TextureBrickWrapper>
        <Image src={br} alt="decorations" />
      </TextureBrickWrapper>
      <StyledTopGradient />
      <StyledBottomGradient />
    </StyledBackground>
  );
};

const GetStartedBlock = ({ content }: Props) => {
  return (
    <Section clearPadding>
      <GetStartedBlockStyled>
        <Background />
        <ContentBlock>
          <Title>{content.title}</Title>
          <Subtitle>{content.subtitle}</Subtitle>
          <CTAWrapper>
            <CTA href={content.cta.url}>{content.cta.title}</CTA>
          </CTAWrapper>
        </ContentBlock>
      </GetStartedBlockStyled>
    </Section>
  );
};

export default GetStartedBlock;
