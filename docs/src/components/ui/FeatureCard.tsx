import React from "react";
import { styled } from "linaria/react";
import Image from "next/image";
import { CTAType } from "./types";
import CTA from "./CTA";
import useWindowSize from "../../hooks/useWindowSize";
import { appTheme, tm } from "../../themes";

const { breakpoints } = appTheme;

interface ArticleType {
  title: string;
  text: string;
}

interface ContentProps {
  getImgPath: (props: { isDesktop: boolean }) => StaticImageData;
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
`;

const ContentContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
`;

const Title = styled.h3`
  font-size: 28px;
  font-style: normal;
  font-weight: 400;
  line-height: 32px;
  letter-spacing: -0.01em;
  margin-bottom: 16px;
  color: ${tm(({ colors }) => colors.neutral900)};
`;

const Text = styled.h3`
  font-size: 18px;
  font-style: normal;
  font-weight: 100;
  line-height: 28px;
  letter-spacing: 0em;
  color: ${tm(({ colors }) => colors.neutral600)};
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
  margin-top: 32px;
`;

const FeatureCard = ({ content, isReversed = false }: Props) => {
  const { getImgPath, cta, articleOne, articleTwo } = content;
  const windowSize = useWindowSize();
  const isDesktop = breakpoints.lg <= windowSize.width;

  return (
    <Container data-desktop={isDesktop} data-reverse={isReversed}>
      <ImageContainer>
        <Image src={getImgPath({ isDesktop })} alt="" quality={100} />
      </ImageContainer>
      <ContentContainer>
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
