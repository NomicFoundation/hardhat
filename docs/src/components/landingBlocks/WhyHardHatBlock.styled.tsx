import { styled } from "linaria/react";
import { media, tm, tmDark, tmSelectors } from "../../themes";

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
  top: calc(50vh - 132px);
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
  background-size: cover;
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
    display: block;
    order: 1;
    width: 335px;
    height: 302px;
    top: calc(50vh - (302px / 2) + 60px);

    .image-wrapper-0 {
      left: -18px;
      bottom: -165px;
    }
    .image-wrapper-1 {
      left: 50%;
      bottom: auto;
      top: 50%;
      transform: translate(-50%, -50%);
    }
    .image-wrapper-2 {
      left: -34px;
      bottom: -162px;
    }
    .image-wrapper-3 {
      left: -119px;
      bottom: -138px;
    }
  }
  ${media.laptop} {
    width: 528px;
    height: 480px;
    top: calc(50vh - (480px / 2) + 70px);

    .image-wrapper-0 {
      left: -46px;
      bottom: -118px;
    }
    .image-wrapper-1 {
      left: -23px;
      top: auto;
      bottom: -101px;
      transform: none;
    }
    .image-wrapper-2 {
      left: -47px;
      bottom: -116px;
    }
    .image-wrapper-3 {
      left: 0;
      bottom: -113px;
    }
  }
  ${media.desktop} {
    height: 528px;
    width: 576px;
    top: calc(50vh - (528px / 2) + 70px);
    .image-wrapper-0 {
      left: calc(50% + 12px);
      bottom: -94px;
      transform: translateX(-50%);
    }
    .image-wrapper-1 {
      left: -48px;
      bottom: -77px;
    }
    .image-wrapper-2 {
      left: -73px;
      bottom: -93px;
    }
    .image-wrapper-3 {
      left: 0;
      bottom: -89px;
    }
  }

  img {
    max-width: none !important;
    max-height: none !important;
  }
`;

const ImageWrapper = styled.div`
  position: absolute;

  z-index: 1;
  opacity: 0;
  transition: opacity 0.2s linear;
  span {
    display: block;
  }
  &.active {
    opacity: 1;
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
  &.image-wrapper-0 {
    max-width: 370px;
  }
  &.image-wrapper-1 {
    max-width: 574px;
  }
  &.image-wrapper-2 {
    max-width: 402px;
  }
  &.image-wrapper-3 {
    width: 572px;
    height: 579px;
    span {
      max-width: 100%;
      max-height: 100%;
    }
  }
  ${media.laptop} {
    &.image-wrapper-0 {
      max-width: 646px;
    }
    &.image-wrapper-1 {
      max-width: 576px;
    }
    &.image-wrapper-2 {
      max-width: 646px;
    }
    &.image-wrapper-3 {
      width: 528px;
      height: 702px;
    }
  }
  ${media.desktop} {
    &.image-wrapper-1 {
      max-width: 624px;
    }
    &.image-wrapper-2 {
      max-width: 696px;
    }
    &.image-wrapper-3 {
      width: 576px;
      height: 702px;
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

const WhyHardHatBlockStyled = {
  Container,
  Heading,
  Title,
  ImageContainer,
  ImageWrapper,
  CardList,
  BottomWrapper,
  BottomWrapperTitle,
  BottomWrapperText,
};

export default WhyHardHatBlockStyled;
