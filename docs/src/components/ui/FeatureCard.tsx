import React from "react";
import Image from "next/image";
import { styled } from "linaria/react";
import { CTAType } from "./types";
import CTA from "./CTA";
import useWindowSize from "../../hooks/useWindowSize";
import { appTheme, tm } from "../../themes";

const { breakpoints, media } = appTheme;

interface ArticleType {
  title: string;
  text: string;
}

interface ContentProps {
  mobileImg: StaticImageData;
  desktopImg: StaticImageData;
  cta: CTAType;
  articleOne: ArticleType;
  articleTwo: ArticleType;
}

interface Props {
  content: ContentProps;
  isReversed?: boolean;
}

const Container = styled.section`
  width: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 24px;
  &[data-desktop="true"] {
    flex-direction: row;
    padding: 0;
    margin-bottom: 128px;
  }
  &[data-desktop="true"][data-reverse="true"] {
    flex-direction: row-reverse;
  }
`;

const ImageContainer = styled.div`
  margin-bottom: 16px;
`;

const ArticleStyled = styled.article`
  margin-bottom: 24px;
  width: 100%;
  display: flex;
  flex-direction: column;
  padding: unset;
  ${media.lg} {
    padding: 32px 0;
    margin-bottom: unset;
  }
`;

const ContentContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  &[data-desktop="true"][data-reverse="false"] {
    margin-left: 24px;
  }
`;

const Title = styled.h3`
  font-family: ChivoBold, sans-serif;
  font-size: 28px;
  line-height: 32px;
  letter-spacing: -0.01em;
  margin-bottom: 16px;
  color: ${tm(({ colors }) => colors.neutral900)};
  ${media.lg} {
    font-size: 42px;
    line-height: 45px;
    letter-spacing: 0.5px;
  }
`;

const Text = styled.h3`
  font-family: ChivoLight, sans-serif;
  font-size: 18px;
  line-height: 28px;
  letter-spacing: 0;
  color: ${tm(({ colors }) => colors.neutral600)};
  ${media.lg} {
    font-size: 18px;
    line-height: 28px;
    letter-spacing: 0;
  }
`;

const Article = ({ title, text }: ArticleType) => {
  return (
    <ArticleStyled>
      <Title>{title}</Title>
      <Text>{text}</Text>
    </ArticleStyled>
  );
};

const CTAWrapper = styled.div`
  margin-top: 8px;
  ${media.lg} {
    margin-top: 40px;
  }
`;

const FeatureCard = ({ content, isReversed = false }: Props) => {
  const { mobileImg, desktopImg, cta, articleOne, articleTwo } = content;
  const windowSize = useWindowSize();
  const isDesktop = breakpoints.lg <= windowSize.width;
  const imgPath = isDesktop ? desktopImg : mobileImg;
  return (
    <Container data-desktop={isDesktop} data-reverse={isReversed}>
      <ImageContainer>
        <Image src={imgPath} alt="Feature card picture" quality={100} />
      </ImageContainer>
      <ContentContainer data-desktop={isDesktop} data-reverse={isReversed}>
        <Article {...articleOne} />
        <Article {...articleTwo} />
        <CTAWrapper>
          <CTA href={cta.url}>{cta.title}</CTA>
        </CTAWrapper>
      </ContentContainer>
    </Container>
  );
};

export default FeatureCard;
