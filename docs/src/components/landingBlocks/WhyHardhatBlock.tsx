"use client";

import React from "react";
import Image, { StaticImageData } from "next/image";
import Section from "../Section";
import LandingContainer from "../LandingContainer";
import ImageMask from "../../assets/why-we/grid.svg";
import ImageMaskDark from "../../assets/why-we/gridDark.svg";
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
                background={ImageMask.src}
                backgroundDark={ImageMaskDark.src}
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
