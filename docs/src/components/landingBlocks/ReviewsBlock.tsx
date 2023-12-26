import React from "react";
import Image, { StaticImageData } from "next/image";
import { Carousel } from "react-responsive-carousel";
import { styled } from "linaria/react";

import Section from "../Section";
import { media, tm, tmDark, tmSelectors } from "../../themes";
import CarouselArrow from "../../assets/icons/carousel-arrow";

interface Props {
  content: Array<{
    name: string;
    position: string;
    personImage: StaticImageData;
    companyImage: string;
    alt: string;
    comment: string;
  }>;
}

const SliderWrapper = styled.div`
  margin-bottom: 240px;
  padding: 0 24px;

  ${media.md} {
    padding: 0;

    & .carousel:before,
    .carousel:after {
      content: "";
      width: 36px;
      position: absolute;
      top: 0;
      min-height: 480px;
      border: 0.1rem solid ${tm(({ colors }) => colors.neutral600)};
      ${tmSelectors.dark} {
        border-color: ${tmDark(({ colors }) => colors.neutral600)};
      }
      ${media.mqDark} {
        ${tmSelectors.auto} {
          border-color: ${tmDark(({ colors }) => colors.neutral600)};
        }
      }
    }

    & .carousel:after {
      right: 0;
      border-left: none;
    }

    & .carousel:before {
      left: 0;
      border-right: none;
    }
  }

  & .carousel {
    position: relative;
    width: 100%;
  }

  & .carousel .slider-wrapper {
    overflow: hidden;
    margin: auto;
    width: 100%;
    transition: height 0.15s ease-in;
  }

  & .carousel .slider-wrapper.axis-horizontal .slider {
    -ms-box-orient: horizontal;
    display: -webkit-box;
    display: -moz-box;
    display: -ms-flexbox;
    display: -moz-flex;
    display: -webkit-flex;
    display: flex;
  }

  & .carousel .slide {
    min-width: 100%;
    margin: 0;
    position: relative;
    text-align: center;
    list-style: none;
  }
`;

const SlideContainer = styled.div`
  display: flex;
  flex-direction: column;
  ${media.md} {
    padding: 100px 82px;
    height: 490px;
    flex-direction: row;
  }
`;

const ImageWithCaptionContainer = styled.div`
  margin-bottom: 42px;
  display: flex;
  justify-content: center;
  width: 100%;

  ${media.md} {
    width: 29%;
    align-items: center;
    padding: 0 10px;
    flex-direction: column;
    margin: 0 40px 0 0;
  }
`;

const PersonImage = styled.div`
  min-height: 110px;
  min-width: 110px;
  width: 110px;
  height: 110px;
  border-radius: 100px;
  overflow: hidden;

  ${media.md} {
    min-height: 150px;
    min-width: 150px;
    width: 150px;
    height: 150px;
    margin-bottom: 10px;
  }
`;

const PersonCaption = styled.div`
  margin-left: 30px;
  text-align: left;
  font-family: ChivoRegular, sans-serif;
  font-weight: normal;
  font-size: 15px;
  line-height: 24px;
  color: ${tm(({ colors }) => colors.neutral900)};

  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral900)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.neutral900)};
    }
  }

  ${media.md} {
    margin-left: 0;
    text-align: center;
    margin-top: 24px;

    & > p {
      display: inline;
    }

    & > img {
      display: block;
      margin: 10px auto;
      max-height: 40px;
      max-width: 100px;
    }
  }
`;

const CommentContainer = styled.p`
  text-align: left;
  font-family: ChivoLight, sans-serif;
  font-weight: 400;
  font-size: 15px;
  line-height: 28px;
  color: ${tm(({ colors }) => colors.neutral600)};
  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral800)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.neutral800)};
    }
  }
  ${media.md} {
    width: 70%;
    padding: 24px;
    align-self: center;
  }
`;

const SliderArrow = styled.button`
  position: absolute;
  width: 24px;
  height: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  top: 30px;
  z-index: 1;
  background-color: ${tm(({ colors }) => colors.neutral0)};
  border: none;
  box-shadow: 0 3px 6px ${tm(({ colors }) => colors.sliderButtonShadow)};
  border-radius: 30px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  border: 1px solid ${tm(({ colors }) => colors.transparent)};

  ${tmSelectors.dark} {
    border-color: ${tmDark(({ colors }) => colors.neutral600)};
    background-color: ${tmDark(({ colors }) => colors.neutral0)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-color: ${tmDark(({ colors }) => colors.neutral0)};
      border-color: ${tmDark(({ colors }) => colors.neutral600)};
    }
  }

  & > span {
    top: 2px;
    right: 2px;
  }

  &.right {
    right: -20px;
    transform: scaleX(-1);
  }

  &.left {
    left: -20px;
  }

  & > svg {
    width: 4px;
    height: 8px;
  }

  ${media.md} {
    width: 48px;
    height: 48px;
    top: 210px;
    & > svg {
      width: 8px;
      height: 17px;
    }

    &:hover {
      top: 205px;
      box-shadow: 0 8px 20px
        ${tm(({ colors }) => colors.sliderButtonHoverShadow)};
    }

    &:active {
      background-color: ${tm(({ colors }) => colors.neutral100)};
      ${tmSelectors.dark} {
        background-color: ${tmDark(({ colors }) => colors.neutral100)};
      }
      ${media.mqDark} {
        ${tmSelectors.auto} {
          background-color: ${tmDark(({ colors }) => colors.neutral100)};
        }
      }
    }

    &.right {
      right: -80px;
    }

    &.left {
      left: -80px;
    }
  }
`;

const NamePositionBlock = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
  ${media.md} {
    align-items: center;
  }
`;

const ReviewsBlock = ({ content }: Props) => {
  return (
    <Section>
      <SliderWrapper>
        <Carousel
          showIndicators={false}
          showStatus={false}
          showThumbs={false}
          infiniteLoop
          transitionTime={800}
          renderArrowNext={(clickHandler, hasNext, label) =>
            hasNext && (
              <SliderArrow
                onClick={clickHandler}
                title={label}
                className="right"
              >
                <CarouselArrow />
              </SliderArrow>
            )
          }
          renderArrowPrev={(clickHandler, hasPrev, label) =>
            hasPrev && (
              <SliderArrow
                onClick={clickHandler}
                title={label}
                className="left"
              >
                <CarouselArrow />
              </SliderArrow>
            )
          }
        >
          {content.map((item) => (
            <SlideContainer key={item.name}>
              <ImageWithCaptionContainer>
                <PersonImage>
                  <Image src={item.personImage} alt="Picture of the author" />
                </PersonImage>
                <PersonCaption>
                  <NamePositionBlock>
                    <p>{item.name},</p>
                    <p> {item.position}</p>
                  </NamePositionBlock>

                  <Image
                    src={item.companyImage}
                    alt="company-logo"
                    width={100}
                    height={40}
                  />
                </PersonCaption>
              </ImageWithCaptionContainer>
              <CommentContainer>{item.comment}</CommentContainer>
            </SlideContainer>
          ))}
        </Carousel>
      </SliderWrapper>
    </Section>
  );
};

export default ReviewsBlock;
