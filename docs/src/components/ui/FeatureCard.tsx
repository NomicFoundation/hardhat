import React, { forwardRef } from "react";
import Image, { StaticImageData } from "next/image";
import { styled } from "linaria/react";
import { CTAType } from "./types";
import CTA from "./CTA";
import { media, tm, tmDark, tmSelectors } from "../../themes";
import ImageMask from "../../assets/why-we/grid.svg";
import ImageMaskDark from "../../assets/why-we/gridDark.svg";
import ArrowRight from "../../assets/icons/arrow-right";

interface ArticleType {
  title: string;
  text: string;
  icon: React.FC<any>;
  cta: CTAType;
}

interface ContentProps {
  image: {
    lg: StaticImageData;
    md: StaticImageData;
    sm: StaticImageData;
  };
  imageDark: {
    lg: StaticImageData;
    md: StaticImageData;
    sm: StaticImageData;
  };
  articleOne: ArticleType;
  articleTwo: ArticleType;
}

interface Props {
  content: ContentProps;
  index: number;
}

const Container = styled.section`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
  grid-column: 1/2;
  margin: 0 -16px;

  &:nth-child(2) {
    .light,
    .dark {
      margin-right: 24px;
    }
  }
  ${media.tablet} {
    flex-direction: row;
    margin: 0;
  }
`;

const ImageContainer = styled.div<{
  background: string;
  backgroundDark: string;
}>`
  position: relative;

  width: 288px;
  height: 264px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  order: -1;
  background-image: ${(props) => `url(${props.background})`};
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  ${tmSelectors.dark} {
    background-image: ${(props) => `url(${props.backgroundDark})`};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-image: ${(props) => `url(${props.backgroundDark})`};
    }
  }
  ${media.tablet} {
    order: 1;
    width: 335px;
    height: 302px;
    display: none;
  }

  img {
    max-width: none !important;
    max-height: none !important;
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
  padding: 8px 24px 0 24px;
  border-left-width: 2px;
  border-left-style: solid;
  transition: border-color 0.2s ease-in-out;
  border-left-color: ${tm(({ colors }) => colors.gray3)};

  ${tmSelectors.dark} {
    border-left-color: ${tmDark(({ colors }) => colors.gray3)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      border-left-color: ${tmDark(({ colors }) => colors.gray3)};
    }
  }
  &:hover {
    border-left-color: #5e21ff !important;
    .feature-icon {
      stroke: #5e21ff;
      fill: #5e21ff;
    }
    .primary {
      background-color: #5e21ff !important;
      color: #fbfbfb !important;
      .icon {
        color: #d2d3d5 !important;
      }
    }
  }
  ${media.tablet} {
    border-left-width: 1px;
    padding: 32px 16px 0 24px;
  }
  ${media.laptop} {
    padding: 32px 16px 0 38px;
  }
`;

const ContentContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 32px;
  ${media.tablet} {
    gap: 16px;
  }
`;

const Title = styled.h3`
  font-family: Roboto, sans-serif;
  font-weight: 600;
  font-size: 18px;
  line-height: 1.5;
  letter-spacing: 0.046em;
  margin-bottom: 10px;

  color: ${tm(({ colors }) => colors.gray8b)};

  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.gray8b)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.gray8b)};
    }
  }
  ${media.tablet} {
    font-size: 20px;
    line-height: 1.3;
    margin-bottom: 8px;
  }
  ${media.laptop} {
    font-size: 25px;
    line-height: 1.5;
    margin-bottom: 16px;
  }
  ${media.desktop} {
    font-size: 31px;
    line-height: 1.32;
  }
`;

const Text = styled.p`
  font-family: Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  letter-spacing: 0.05em;
  color: ${tm(({ colors }) => colors.gray6)};

  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.gray6)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.gray6)};
    }
  }

  ${media.desktop} {
    font-size: 16px;
  }
`;

const CTAWrapper = styled.div`
  margin-top: 15px;

  .icon {
    fill: currentColor;
    width: 12px;
    height: 12px;
  }
  .primary {
    padding: 9px 16px;
    font-size: 12px;
    gap: 6px;
  }
  ${tmSelectors.dark} {
    .primary {
      background-color: #333538;
      color: #b0b2b5;
    }
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      .primary {
        background-color: #333538;
        color: #b0b2b5;
      }
    }
  }
  ${media.tablet} {
    .icon {
      width: 16px;
      height: 16px;
    }
    .primary {
      padding: 13px 16px;
      gap: 6px;
    }
  }
  ${media.laptop} {
    margin-top: 28px;
    .primary {
      font-size: 14px;
      padding: 16px 20px;
      gap: 12px;
    }
  }
  ${media.desktop} {
    .primary {
      padding: 19px 24px;
      font-size: 16px;
      letter-spacing: 0.02em;
    }
  }
`;

const IconContainer = styled.div`
  display: block;
  margin-bottom: 8px;
  font-size: 32px;
  svg {
    width: auto;
    height: 1em;
    display: block;
    fill: #fbfbfb;
    stroke: #b0b2b5;
    transition: fill 0.2s ease-in-out, stroke 0.2s ease-in-out;
  }
  ${tmSelectors.dark} {
    svg {
      stroke: #333538;
      fill: #16181d;
    }
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      svg {
        stroke: #333538;
        fill: #16181d;
      }
    }
  }
  ${media.laptop} {
    margin-bottom: 12px;
    svg {
      font-size: 44px;
    }
  }
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

const FeatureCard = forwardRef<HTMLDivElement, Props>(
  ({ content, index }: Props, ref) => {
    const { image, imageDark, articleOne, articleTwo } = content;

    return (
      <Container className="feature-card" data-index={index} ref={ref}>
        <ContentContainer>
          <Article {...articleOne} />
          <Article {...articleTwo} />
        </ContentContainer>
        <ImageContainer
          className="image-container"
          background={ImageMask.src}
          backgroundDark={ImageMaskDark.src}
        >
          <ImageWrapper className="light">
            <Image src={image.sm} alt="Feature card picture" quality={100} />
          </ImageWrapper>
          <ImageWrapper className="dark">
            <Image
              src={imageDark.sm}
              alt="Feature card picture"
              quality={100}
            />
          </ImageWrapper>
        </ImageContainer>
      </Container>
    );
  }
);
FeatureCard.displayName = "FeatureCard";

export default FeatureCard;
