"use client";

import React from "react";
import Image, { StaticImageData } from "next/image";
import Section from "../Section";
import LandingContainer from "../LandingContainer";
import ImageMaskDesktop from "../../assets/why-we/gridDesktop.svg";
import ImageMaskLaptop from "../../assets/why-we/gridLaptop.svg";
import ImageMaskTablet from "../../assets/why-we/gridTablet.svg";
import ImageMaskMobile from "../../assets/why-we/gridMobile.svg";
import ImageMaskDarkDesktop from "../../assets/why-we/gridDarkDesktop.svg";
import ImageMaskDarkLaptop from "../../assets/why-we/gridDarkLaptop.svg";
import ImageMaskDarkTablet from "../../assets/why-we/gridDarkTablet.svg";
import ImageMaskDarkMobile from "../../assets/why-we/gridDarkMobile.svg";
import LinesMobile from "../../assets/why-we/linesMobile";
import LinesDesktop from "../../assets/why-we/linesDesktop";
import useWindowSize from "../../hooks/useWindowSize";
import { CTAType } from "../ui/types";
import FeatureCard from "../ui/FeatureCard";
import useImageAnimation from "../../hooks/useImageAnimation";
import WhyHardHatBlockStyled from "./WhyHardHatBlock.styled";
import getImage from "../../utils";

const {
  Container,
  Heading,
  Title,
  ImageContainer,
  ImageWrapper,
  CardList,
  BottomWrapper,
  BottomWrapperTitle,
  BottomWrapperText,
} = WhyHardHatBlockStyled;

interface ArticleType {
  title: string;
  text: string;
  icon: React.FC<any>;
  cta: CTAType;
}
interface ContentProps {
  image: {
    lg: StaticImageData;
    m?: StaticImageData;
    md: StaticImageData;
    sm: StaticImageData;
  };
  imageDark: {
    lg: StaticImageData;
    m?: StaticImageData;
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

function ImageMask(width: number, dark?: boolean): string {
  if (width >= 1700) {
    return dark ? ImageMaskDarkDesktop.src : ImageMaskDesktop.src;
  }
  if (width >= 1280) {
    return dark ? ImageMaskDarkLaptop.src : ImageMaskLaptop.src;
  }
  if (width >= 768) {
    return dark ? ImageMaskDarkTablet.src : ImageMaskTablet.src;
  }
  return dark ? ImageMaskDarkMobile.src : ImageMaskMobile.src;
}

const WhyHardhatBlock = ({ content }: Props) => {
  const { width } = useWindowSize();

  const { activeIndex, cardsRef } = useImageAnimation(content, width);

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
            {width >= 768 && (
              <ImageContainer
                className={`image-container image-container-${activeIndex}`}
                background={ImageMask(width, false)}
                backgroundDark={ImageMask(width, true)}
              >
                {content.featureCards.map((item, index) => {
                  const lightImage = getImage(item, width, "light");
                  const darkImage = getImage(item, width, "dark");

                  return (
                    <>
                      <ImageWrapper
                        className={`light image-wrapper-${index}  ${
                          activeIndex === index ? "active" : ""
                        }`}
                      >
                        <Image
                          src={lightImage}
                          alt="Feature card picture"
                          quality={100}
                          layout="intrinsic"
                        />
                      </ImageWrapper>
                      <ImageWrapper
                        className={`dark image-wrapper-${index}  ${
                          activeIndex === index ? "active" : ""
                        }`}
                      >
                        <Image
                          src={darkImage}
                          alt="Feature card picture"
                          quality={100}
                          layout="intrinsic"
                        />
                      </ImageWrapper>
                    </>
                  );
                })}
              </ImageContainer>
            )}
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
