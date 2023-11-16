import React from "react";
import Image, { StaticImageData } from "next/image";
import { styled } from "linaria/react";
import { CTAType } from "./types";
import CTA from "./CTA";
import useWindowSize from "../../hooks/useWindowSize";
import { breakpoints, media, tm, tmDark, tmSelectors } from "../../themes";

interface ArticleType {
  title: string;
  text: string;
}

interface ContentProps {
  mobileImgDark: StaticImageData;
  desktopImgDark: StaticImageData;
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
  padding: 24px 0 24px 24px;
  overflow: hidden;
  ${media.md} {
    overflow: visible;
    flex-direction: row;
    padding: 0;
    margin-bottom: 128px;
    &[data-reverse="true"] {
      flex-direction: row-reverse;
    }
  }
`;

const ImageContainer = styled.div`
  margin-bottom: 16px;
  position: relative;
  width: 100%;
  padding-top: 80%;
  overflow: hidden;
  ${media.smd} {
    padding-top: 40%;
  }
  ${media.md} {
    padding-top: unset;
    overflow: visible;
  }
`;

const ImageWrapper = styled.div`
  position: absolute;
  top: 20%;
  left: 50%;
  width: 100%;
  transform: translateX(-50%);
  height: 300px;
  display: flex;
  justify-content: center;
  align-items: center;
  ${media.smd} {
    width: unset;
  }

  & > span {
    transform: scale(1.5);
  }

  ${media.md} {
    width: 116%;
    top: 0;
    right: -16%;
    left: unset;
    height: auto;
    transform: translateX(-10%);
    & > span {
      transform: none;
    }

    &[data-reverse="true"] {
      left: 20%;
      right: unset;
    }
  }
  &.dark {
    display: none;
  }
  ${tmSelectors.dark} {
    &.dark {
      display: block;
    }
    &.light {
      display: none;
    }
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      &.dark {
        display: block;
      }
      &.light {
        display: none;
      }
    }
  }
`;

const ArticleStyled = styled.article`
  margin-bottom: 24px;
  width: 100%;
  display: flex;
  flex-direction: column;
  padding: unset;
  ${media.md} {
    padding: 32px 0;
    margin-bottom: unset;
  }
`;

const ContentContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  margin-top: 16px;
  ${media.md} {
    margin-top: unset;
    &[data-reverse="false"] {
      margin-left: 46px;
    }
  }
`;

const Title = styled.h3`
  font-family: ChivoBold, sans-serif;
  font-weight: normal;
  font-size: 28px;
  line-height: 32px;
  letter-spacing: -0.01em;
  margin-bottom: 24px;
  color: ${tm(({ colors }) => colors.neutral900)};
  ${media.md} {
    font-size: 42px;
    line-height: 45px;
    letter-spacing: 0.5px;
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

const Text = styled.p`
  font-family: ChivoLight, sans-serif;
  font-size: 18px;
  line-height: 28px;
  letter-spacing: 0;
  color: ${tm(({ colors }) => colors.neutral600)};
  ${media.md} {
    font-size: 18px;
    line-height: 28px;
    letter-spacing: 0;
  }
  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral600)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.neutral600)};
    }
  }
`;

const CTAWrapper = styled.div`
  margin-top: 8px;
  ${media.md} {
    margin-top: 40px;
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

const FeatureCard = ({ content, isReversed = false }: Props) => {
  const {
    mobileImg,
    desktopImg,
    cta,
    articleOne,
    articleTwo,
    mobileImgDark,
    desktopImgDark,
  } = content;
  const windowSize = useWindowSize();
  const isDesktop = breakpoints.md <= windowSize.width;
  const imgPath = isDesktop ? desktopImg : mobileImg;
  const imgPathDark = isDesktop ? desktopImgDark : mobileImgDark;

  return (
    <Container data-reverse={isReversed}>
      <ImageContainer>
        <ImageWrapper data-reverse={isReversed} className="light">
          <Image src={imgPath} alt="Feature card picture" quality={100} />
        </ImageWrapper>
        <ImageWrapper data-reverse={isReversed} className="dark">
          <Image src={imgPathDark} alt="Feature card picture" quality={100} />
        </ImageWrapper>
      </ImageContainer>
      <ContentContainer data-reverse={isReversed}>
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
