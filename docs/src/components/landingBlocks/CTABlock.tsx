import React from "react";
import { styled } from "linaria/react";
import { appTheme, tm } from "../../themes";
import useWindowSize from "../../hooks/useWindowSize";
import Images from "../../assets/images";
import CTA from "../ui/CTA";
import Section from "../Section";
import defaultProps from "../ui/default-props";

const { defaultCTAContent } = defaultProps;
const { TextureBrick } = Images;
const { media, breakpoints } = appTheme;

interface Props {
  content: typeof defaultCTAContent;
}

const CTABlockStyled = styled.section`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 16px;
  height: 724px;
  overflow: hidden;
  background: ${tm(({ colors }) => colors.neutralBackground)};
  position: relative;
  margin: 48px 0;
  ${media.lg} {
    margin: unset;
    height: 792px;
  }
`;

const StyledBackground = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  background: ${tm(({ colors }) => colors.textureBackground)};
  height: 100%;
  width: 100%;
`;

const TextureBrickWrapper = styled.div`
  position: absolute;
  right: 0;
  &.left {
    transform: scaleX(-1);
    left: 0;
    right: auto;
  }
`;

const ContentBlock = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 1;
`;

const Title = styled.h1`
  font-family: ChivoBold, sans-serif;
  font-size: 39px;
  line-height: 41px;
  letter-spacing: -0.01em;
  text-align: center;
  max-width: 642px;
  ${media.lg} {
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
  ${media.lg} {
    font-size: 24px;
    line-height: 40px;
    margin-top: 32px;
    margin-bottom: 64px;
  }
`;

const Background = () => {
  const windowSize = useWindowSize();
  const isDesktop = breakpoints.lg <= windowSize.width;
  return (
    <StyledBackground>
      {isDesktop && (
        <TextureBrickWrapper className="left">
          <TextureBrick />
        </TextureBrickWrapper>
      )}
      <TextureBrickWrapper>
        <TextureBrick />
      </TextureBrickWrapper>
    </StyledBackground>
  );
};

const CTABlock = ({ content }: Props) => {
  return (
    <Section clearPadding>
      <CTABlockStyled>
        <Background />
        <ContentBlock>
          <Title>{content.title}</Title>
          <Subtitle>{content.subtitle}</Subtitle>
          <CTA href={content.cta.url}>{content.cta.title}</CTA>
        </ContentBlock>
      </CTABlockStyled>
    </Section>
  );
};

export default CTABlock;
