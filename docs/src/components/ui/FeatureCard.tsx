import React from "react";
import Image, { StaticImageData } from "next/image";
import { styled } from "linaria/react";
import { CTAType } from "./types";
import CTA from "./CTA";
import { breakpoints, media, tm, tmDark, tmSelectors } from "../../themes";
import ImageMask from "../../assets/why-we/grid.svg";
import ArrowRight from "../../assets/icons/arrow-right";

interface ArticleType {
  title: string;
  text: string;
  icon: React.FC<any>;
  cta: CTAType;
}

interface ContentProps {
  image: StaticImageData;
  imageDark: StaticImageData;
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
  align-items: center;
  gap: 120px;
`;

const ImageContainer = styled.div`
  margin-bottom: 16px;
  position: relative;
  height: 528px;
  width: 576px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    max-width: none !important;
    max-height: none !important;
  }
`;

const ImageGrid = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  img {
    width: 100%;
    height: 100%;
  }
`;
const ImageWrapper = styled.div`
  position: relative;
  z-index: 1;
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
  width: 100%;
  padding: 32px 16px 0 38px;
  border-left: 1px solid #d2d3d5;
`;

const ContentContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Title = styled.h3`
  font-family: Roboto, sans-serif;
  font-weight: 600;
  font-size: 31px;
  line-height: 1.32;
  letter-spacing: 0.046em;
  margin-bottom: 16px;
  text-wrap: balance;
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

const Text = styled.p`
  font-family: Roboto, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  letter-spacing: 0.05em;
  color: ${tm(({ colors }) => colors.neutral600)};

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
  margin-top: 28px;

  .icon {
    fill: currentColor;
    width: 16px;
    height: 16px;
  }
`;

const IconContainer = styled.div`
  display: block;
  margin-bottom: 8px;
`;

const Article = ({ title, text, cta, icon: Icon }: ArticleType) => {
  return (
    <ArticleStyled>
      <IconContainer>
        <Icon />
      </IconContainer>
      <Title>{title}</Title>
      <Text>{text}</Text>
      <CTAWrapper>
        <CTA href={cta.url} variant="primary">
          {cta.title}
          <ArrowRight />
        </CTA>
      </CTAWrapper>
    </ArticleStyled>
  );
};

const FeatureCard = ({ content }: Props) => {
  const { image, imageDark, articleOne, articleTwo } = content;

  return (
    <Container>
      <ContentContainer>
        <Article {...articleOne} />
        <Article {...articleTwo} />
      </ContentContainer>
      <ImageContainer>
        <ImageWrapper className="light">
          <Image src={image} alt="Feature card picture" quality={100} />
        </ImageWrapper>
        <ImageWrapper className="dark">
          <Image src={imageDark} alt="Feature card picture" quality={100} />
        </ImageWrapper>
        <ImageGrid>
          <Image src={ImageMask} alt="Feature card picture" layout="fill" />
        </ImageGrid>
      </ImageContainer>
    </Container>
  );
};

export default FeatureCard;
