import React, { useEffect, useRef, useState } from "react";

import { styled } from "linaria/react";
import Image, { StaticImageData } from "next/image";
import Section from "../Section";
import { media, tm, tmDark, tmSelectors } from "../../themes";
import LandingContainer from "../LandingContainer";
import ImageMask from "../../assets/why-we/grid.svg";
import ImageMaskDark from "../../assets/why-we/gridDark.svg";
import LinesMobile from "../../assets/why-we/linesMobile";
import LinesDesktop from "../../assets/why-we/linesDesktop";
import useWindowSize from "../../hooks/useWindowSize";
import { CTAType } from "../ui/types";
import FeatureCard from "../ui/FeatureCard";

const gsap = require("gsap").default;
const ScrollTrigger = require("gsap/ScrollTrigger").default;
gsap.registerPlugin(ScrollTrigger);

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

type Props = React.PropsWithChildren<{
  content: {
    title: string;
    footer: { title: string; text: string };
    featureCards: ContentProps[];
  };
}>;

const Container = styled.section`
  width: 100%;
  position: relative;
  padding-top: 30px;
  padding-bottom: 78px;
  background: linear-gradient(
    180deg,
    rgba(245, 245, 255, 0) 2.01%,
    #f5f5ff 48.63%,
    rgba(245, 245, 255, 0) 95.25%
  );
  ${tmSelectors.dark} {
    background: linear-gradient(
      180deg,
      #181a1f 9.32%,
      #202329 53.28%,
      #181a1f 97.24%
    );
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      background: linear-gradient(
        180deg,
        #181a1f 9.32%,
        #202329 53.28%,
        #181a1f 97.24%
      );
    }
  }

  ${media.tablet} {
    padding-top: 102px;
    padding-bottom: 100px;
  }
  ${media.laptop} {
    padding-bottom: 135px;
  }
  ${media.desktop} {
    padding-top: 92px;
    padding-bottom: 105px;
  }
`;

const Heading = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  margin-bottom: 100px;
  ${media.tablet} {
    margin-bottom: 79px;
  }
  ${media.laptop} {
    justify-content: flex-start;
  }
  ${media.desktop} {
    margin-bottom: 52px;
  }
`;

const Title = styled.h2`
  color: ${tm(({ colors }) => colors.gray8b)};
  text-transform: capitalize;
  font-size: 25px;
  font-weight: 600;
  font-family: SourceCodePro, sans-serif;
  line-height: 1.2;
  letter-spacing: 0.045em;
  position: relative;
  .linesDesktop {
    display: none;
  }
  .linesMobile {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: calc(100% + 30px);
    stroke: ${tm(({ colors }) => colors.gray3)};
  }
  .linesMobile:nth-child(2) {
    left: calc(100% + 30px);
    right: auto;
    transform: translateY(-50%) rotate(180deg);
  }
  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.gray8b)};
    .linesMobile,
    .linesDesktop {
      stroke: ${tmDark(({ colors }) => colors.gray3)};
    }
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.gray8b)};
      .linesMobile,
      .linesDesktop {
        stroke: ${tmDark(({ colors }) => colors.gray3)};
      }
    }
  }
  ${media.tablet} {
    font-size: 31px;
  }
  ${media.laptop} {
    font-size: 39px;
    .linesDesktop {
      right: calc(100% + 24px);
      position: absolute;
      top: 50%;
      margin-top: -49px;
      stroke: #d2d3d5;
      display: block;
    }
    .linesMobile {
      display: none;
    }
  }
  ${media.desktop} {
    font-size: 49px;
  }
`;

const ImageContainer = styled.div<{
  background: string;
  backgroundDark: string;
}>`
  position: sticky;
  top: 320px;
  width: 288px;
  height: 264px;
  flex: none;
  display: none;
  align-items: center;
  justify-content: center;
  order: -1;
  grid-column: 2/3;
  grid-row: 1/2;
  background-image: ${(props) => `url(${props.background})`};
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  ${tmSelectors.dark} {
    background-image: ${(props) => `url(${props.backgroundDark})`};
    &.image-container-0:before {
      background: #333538;
    }
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-image: ${(props) => `url(${props.backgroundDark})`};
      &.image-container-0:before {
        background: #333538;
      }
    }
  }

  ${media.tablet} {
    display: flex;
    order: 1;
    width: 335px;
    height: 302px;
    &.image-container-1 {
      .light,
      .dark {
        margin-right: 0;
      }
    }
  }
  ${media.laptop} {
    width: 528px;
    height: 480px;
    &.image-container-0 {
      .light,
      .dark {
        margin-right: -26px;
      }

      &:before {
        content: "";
        position: absolute;
        bottom: calc(100% + 30px);
        left: 384px;
        width: 1px;
        background: #e5e6e7;
        height: 647px;
      }
    }
    &.image-container-1 {
      .light,
      .dark {
        margin-right: 51px;
      }
    }
  }
  ${media.desktop} {
    height: 528px;
    width: 576px;
    &.image-container-0:before {
      bottom: calc(100% + 45px);
      left: 313px;
      height: 592px;
    }
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

const CardList = styled.div`
  display: grid;
  grid-template-rows: auto;
  gap: 102px;
  ${media.tablet} {
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 62px 30px;
  }
  ${media.laptop} {
    gap: 248px 40px;
  }
  ${media.desktop} {
    gap: 208px 120px;
  }
`;

const BottomWrapper = styled.div`
  text-align: center;
  position: relative;
  padding: 32px 0 63px;
  ${media.tablet} {
    padding: 32px 0 98px;
  }
  ${media.laptop} {
    padding: 66px 0;
  }
`;

const BottomWrapperTitle = styled.div`
  font-size: 18px;
  font-weight: 600;
  font-family: SourceCodePro, sans-serif;
  line-height: 1.2;
  letter-spacing: 0.05em;
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
  }
  ${media.laptop} {
    font-size: 25px;
    font-weight: 500;
  }
  ${media.desktop} {
    font-size: 31px;
  }
`;

const BottomWrapperText = styled.div`
  font-size: 14px;
  fweight: 400;
  font-family: Roboto, sans-serif;
  line-height: 1.5;
  margin-top: 12px;
  margin-left: auto;
  margin-right: auto;
  letter-spacing: 0.05em;

  max-width: 338px;
  color: ${tm(({ colors }) => colors.gray5)};

  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.gray5)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.gray5)};
    }
  }
  ${media.tablet} {
    font-size: 16px;
    max-width: none;
    line-height: 1.2;
  }
  ${media.laptop} {
    font-size: 18px;
    margin-top: 14px;
  }
  ${media.desktop} {
    font-size: 20px;
  }
`;

function getImage(card: any, screenWidth: number, type: string) {
  const isLarge = screenWidth > 1279;

  if (type === "light") {
    if (isLarge) return card.image.lg;
    return card.image.md;
  }

  if (isLarge) return card.imageDark.lg;
  return card.imageDark.md;
}

const WhyHardhatBlock = ({ content }: Props) => {
  const { width } = useWindowSize();
  const [activeImageLight, setActiveImageLight] = useState(
    getImage(content.featureCards[0], width, "light")
  );
  const [activeImageDark, setActiveImageDark] = useState(
    getImage(content.featureCards[0], width, "dark")
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  const updateImage = (index: number) => {
    setActiveImageLight(getImage(content.featureCards[index], width, "light"));
    setActiveImageDark(getImage(content.featureCards[index], width, "dark"));
    setActiveIndex(index);
  };

  useEffect(() => {
    updateImage(0);
    const triggers = content.featureCards.map((_, index) => {
      return ScrollTrigger.create({
        trigger: cardsRef.current[index],
        start: "top center",
        end: "bottom center",
        onEnter: () => updateImage(index),
        onEnterBack: () => updateImage(index),
      });
    });

    return () => {
      triggers.forEach((trigger) => trigger.kill());
    };
  }, [width, content.featureCards]);

  return (
    <Section clearPadding>
      <Container>
        <LandingContainer>
          <Heading>
            <Title>
              <LinesMobile />
              <LinesMobile />
              {content.title}
              <LinesDesktop />
            </Title>
          </Heading>

          <CardList>
            {content.featureCards.map((item, index) => (
              <FeatureCard
                key={index}
                content={item}
                index={index}
                ref={(el) => {
                  if (el) {
                    cardsRef.current[index] = el;
                  }
                }}
              />
            ))}
            <ImageContainer
              className={`image-container image-container-${activeIndex}`} // Динамический класс
              background={ImageMask.src}
              backgroundDark={ImageMaskDark.src}
            >
              <ImageWrapper className="light">
                <Image
                  src={activeImageLight}
                  alt="Feature card picture"
                  quality={100}
                />
              </ImageWrapper>
              <ImageWrapper className="dark">
                <Image
                  src={activeImageDark}
                  alt="Feature card picture"
                  quality={100}
                />
              </ImageWrapper>
            </ImageContainer>
          </CardList>
        </LandingContainer>
      </Container>
      <BottomWrapper>
        <LandingContainer>
          <BottomWrapperTitle>{content.footer.title}</BottomWrapperTitle>
          <BottomWrapperText>{content.footer.text}</BottomWrapperText>
        </LandingContainer>
      </BottomWrapper>
    </Section>
  );
};

export default WhyHardhatBlock;
