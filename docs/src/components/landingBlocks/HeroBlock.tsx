import React from "react";
import { styled } from "linaria/react";
import Section from "../Section";
import CTA from "../ui/CTA";
import { media, tm, tmDark, tmSelectors } from "../../themes";
import { CTAType } from "../ui/types";
import DesktopAnimation from "../DesktopAnimation";
import MobileAnimation from "../MobileAnimation";

interface Props {
  content: {
    title: string;
    tagline: string;
    cta: CTAType;
  };
}

const Container = styled.section`
  width: 100%;
  display: flex;
  flex-direction: column;
  margin-top: 40px;
  color: ${tm(({ colors }) => colors.neutral900)};
  margin-bottom: 300px;
  ${media.md} {
    flex-direction: row;
    justify-content: space-between;
    margin-bottom: 280px;
  }
  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral900)};
  }

  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.neutral900)};
    }
  }
`;

const Block = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  padding: 0 0 24px;
  min-height: 100px;
  &.content {
    z-index: 2;
  }
  & svg {
    margin: 0 auto;
  }
  &.animation-container {
    height: calc(100vh - 700px);
  }
  ${media.md} {
    width: 40%;
    &:first-child {
      width: 60%;
    }
    padding: 0;
    position: relative;
    &.animation-container {
      height: auto;
    }
  }
`;

const TagLine = styled.span`
  font-family: ChivoLight, sans-serif;
  margin-bottom: 24px;
  font-size: 22px;
  line-height: 32px;
  letter-spacing: -0.02em;
  text-align: left;
  ${media.md} {
    font-size: 32px;
    line-height: 32px;
    letter-spacing: 0;
    text-align: left;
    margin-top: 32px;
  }
`;

const Title = styled.h1`
  margin-bottom: 48px;
  font-size: 40px;
  line-height: 45px;
  letter-spacing: -0.01em;
  font-family: ChivoBold, sans-serif;
  font-weight: normal;
  ${media.md} {
    margin-bottom: 64px;
    font-size: 72px;
    line-height: 72px;
    letter-spacing: 0;
  }
`;

const HeroBlock = ({ content }: Props) => {
  return (
    <Section>
      <Container>
        <Block className="content">
          <TagLine>{content.tagline}</TagLine>
          <Title>{content.title}</Title>
          <CTA href={content.cta.url}>{content.cta.title}</CTA>
        </Block>
        <Block className="animation-container">
          <DesktopAnimation />
          <MobileAnimation />
        </Block>
      </Container>
    </Section>
  );
};

export default HeroBlock;
