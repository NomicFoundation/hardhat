import React from "react";
import { styled } from "linaria/react";
import Section from "../Section";
import CTA from "../ui/CTA";
import { appTheme } from "../../themes";
import Images from "../../assets/images";
import useWindowSize from "../../hooks/useWindowSize";
import defaultProps from "../ui/default-props";

const { defaultHeroBlockContent } = defaultProps;
const { media, breakpoints } = appTheme;
const { HeroPetsImage, HeroGraphicsImage } = Images;
interface Props {
  content: typeof defaultHeroBlockContent;
}

const Container = styled.section`
  width: 100%;
  display: flex;
  flex-direction: column;
  margin-top: 40px;
  ${media.lg} {
    flex-direction: row;
    justify-content: space-between;
  }
`;

const Block = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  padding: 40px 0 24px;
  & svg {
    margin: 0 auto;
  }
  ${media.lg} {
    width: 40%;
    &:first-child {
      width: 60%;
    }
    padding: 0px;
    & svg {
      position: relative;
      right: -10%;
    }
  }
`;

const TagLine = styled.span`
  font-family: ChivoLight;
  margin-bottom: 24px;
  font-size: 22px;
  line-height: 32px;
  letter-spacing: -0.02em;
  text-align: left;
  ${media.lg} {
    font-size: 32px;
    line-height: 32px;
    letter-spacing: 0em;
    text-align: left;
    margin-top: 32px;
  }
`;

const Title = styled.h1`
  margin-bottom: 48px;
  font-size: 40px;
  line-height: 45px;
  letter-spacing: -0.01em;
  ${media.lg} {
    margin-bottom: 64px;
    font-size: 72px;
    line-height: 72px;
    letter-spacing: 0em;
  }
`;

const HeroBlock = ({ content }: Props) => {
  const windowSize = useWindowSize();
  const isDesktop = breakpoints.lg <= windowSize.width;
  return (
    <Section>
      <Container>
        <Block>
          <TagLine>{content.tagline}</TagLine>
          <Title>{content.title}</Title>
          <CTA href={content.cta.url}>{content.cta.title}</CTA>
        </Block>
        <Block>{isDesktop ? <HeroGraphicsImage /> : <HeroPetsImage />}</Block>
      </Container>
    </Section>
  );
};

export default HeroBlock;
