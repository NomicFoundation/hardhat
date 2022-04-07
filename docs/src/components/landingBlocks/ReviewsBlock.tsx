import React from "react";
import { Carousel } from "react-responsive-carousel";
import { styled } from "linaria/react";

import CarouselArrowLeft from "../../assets/images/carrusel-arrow-left.png";

import Section from "../Section";
import { appTheme, tm } from "../../themes";

const { media } = appTheme;

interface Props {
  content: Array<{
    name: string;
    position: string;
    personImage: StaticImageData;
    companyImage: StaticImageData;
    alt: string;
    comment: string;
  }>;
}

const SliderWrapper = styled.div`
  margin-bottom: 240px;

  ${media.lg} {
    & .carousel:before,
    .carousel:after {
      content: "";
      border: 0.1rem solid #d4d4d4;
      width: 5rem;
      position: absolute;
      top: 0;
      min-height: 480px;
    }

    & .carousel:after {
      left: 0;
      border-right: none;
    }

    & .carousel:before {
      right: 0;
      border-left: none;
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
    -webkit-transition: height 0.15s ease-in;
    -moz-transition: height 0.15s ease-in;
    -ms-transition: height 0.15s ease-in;
    -o-transition: height 0.15s ease-in;
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
  ${media.lg} {
    padding: 25px;
    height: 490px;
    flex-direction: row;
  }
`;

const ImageWithCaptionContainer = styled.div`
  margin-bottom: 42px;
  display: flex;
  justify-content: center;
  width: 100%;

  ${media.lg} {
    width: 30%;
    align-items: center;
    padding: 20px 10px 0;
    flex-direction: column;
  }
`;

const PersonImage = styled.div`
  width: 110px;
  height: 110px;
  background-size: 110px;
  background-repeat: no-repeat;
  border-radius: 100px;

  ${media.lg} {
    width: 150px;
    height: 150px;
    background-size: 150px;
    margin-bottom: 10px;
  }
`;

const PersonCaption = styled.div`
  margin-left: 30px;
  text-align: left;
  font-family: ChivoRegular, sans-serif;
  font-weight: 400;
  font-size: 15px;
  line-height: 24px;

  ${media.lg} {
    margin-left: 0;
    text-align: center;

    & > p {
      display: inline;
    }

    & > img {
      display: block;
      margin: 16px auto 0;
    }
  }
`;

const CompanyLogo = styled.div`
  width: 100%;
  height: 100%;
  background-repeat: no-repeat;
  background-size: contain;

  ${media.lg} {
    min-height: 30px;
    background-position: center;
  }
`;

const CommentContainer = styled.p`
  text-align: left;
  font-family: ChivoRegular, sans-serif;
  font-weight: 400;
  font-size: 15px;
  line-height: 28px;
  color: ${tm(({ colors }) => colors.neutral600)};

  ${media.lg} {
    width: 70%;
    padding: 24px;
    align-self: center;
  }
`;

const SliderArrow = styled.button`
  position: absolute;
  width: 34px;
  height: 34px;
  top: 30px;
  z-index: 1;
  background-color: ${tm(({ colors }) => colors.neutral0)};
  border: none;
  box-shadow: 0 3px 6px ${tm(({ colors }) => colors.sliderButtonShadow)};
  border-radius: 30px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &.right {
    right: -20px;
    transform: rotate(180deg);
    & > img {
      margin-top: 5px;
    }
  }

  &.left {
    left: -20px;

    & > img {
      margin-top: 2px;
    }
  }

  ${media.lg} {
    width: 48px;
    height: 48px;
    top: 210px;

    &:hover {
      top: 205px;
      box-shadow: 0 8px 20px
        ${tm(({ colors }) => colors.sliderButtonHoverShadow)};
    }

    &:active {
      background-color: ${tm(({ colors }) => colors.neutral100)};
    }

    &.right {
      right: -80px;
    }

    &.left {
      left: -80px;
    }
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
          renderArrowNext={(clickHandler, hasNext, label) =>
            hasNext && (
              <SliderArrow
                onClick={clickHandler}
                title={label}
                className="right"
              >
                {/* eslint-disable-next-line */}
                <img src={CarouselArrowLeft.src} alt="Carousel next button" />
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
                {/* eslint-disable-next-line */}
                <img src={CarouselArrowLeft.src} alt="Carousel next button" />
              </SliderArrow>
            )
          }
        >
          {content.map((item) => (
            <SlideContainer key={item.name}>
              <ImageWithCaptionContainer>
                <PersonImage
                  style={{ backgroundImage: `url(${item.personImage.src})` }}
                />
                <PersonCaption>
                  <p>{item.name},</p>
                  <p> {item.position}</p>
                  <CompanyLogo
                    style={{
                      backgroundImage: `url(${item.companyImage.src})`,
                    }}
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
