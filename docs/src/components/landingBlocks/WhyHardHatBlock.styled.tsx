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
  &:after {
    content: "";
    position: absolute;
    top: 1px;
    left: 1px;
    right: 1px;
    bottom: 1px;
    border: 1px solid #d5d5d5;
    z-index: 3;
  }
  ${tmSelectors.dark} {
    background-image: ${(props) => `url(${props.backgroundDark})`};
    &:after {
      border-color: #333538;
    }
    &.image-container-0:before {
      background: #292a2b;
    }
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-image: ${(props) => `url(${props.backgroundDark})`};
      &:after {
        border-color: #333538;
      }
      &.image-container-0:before {
        background: #292a2b;
      }
    }
  }
  &.image-container-3:after {
    z-index: 0;
  }

  ${media.tablet} {
    display: block;
    order: 1;
    width: 335px;
    height: 302px;
    top: calc(50vh - (302px / 2) + 60px);
    &.image-container-1 {
      .light,
      .dark {
        margin-left: 0;
      }
    }
    &.image-container-1:after {
      display: none;
    }

    .image-wrapper-0 {
      margin-left: -3px !important;
      margin-top: 10px !important;
    }
    .image-wrapper-2 {
      margin-top: 9px !important;
    }
  }
  ${media.laptop} {
    width: 528px;
    height: 480px;
    top: calc(50vh - (480px / 2) + 70px);
    &.image-container-0 {
      &:before {
        content: "";
        position: absolute;
        bottom: calc(100% + 28px);
        left: 383px;
        width: 1px;
        background: linear-gradient(to bottom, #f3f3f3, #e0e0e0);
        height: 647px;
      }
    }
    &.image-container-1:after {
      display: block;
    }
    .image-wrapper-0 {
      margin-left: 12px !important;
      margin-top: 2px;
    }
    .image-wrapper-1 {
      margin-top: -4px !important;
    }

    .image-wrapper-2 {
      margin-left: 1px !important;
      margin-top: 30px !important;
    }
    .image-wrapper-3 {
      margin-top: 4px !important;
    }
  }
  ${media.desktop} {
    height: 528px;
    width: 576px;
    top: calc(50vh - (528px / 2) + 70px);
    &.image-container-0:before {
      bottom: calc(100% + 45px);
      left: 314px;
      height: 564px;
    }

    &.image-container-2 {
      margin-left: 0;
    }

    .image-wrapper-1 {
      margin-left: -24px !important;
    }
    .image-wrapper-2 {
      margin-left: -13px !important;
    }
  }

  img {
    max-width: none !important;
    max-height: none !important;
  }
`;

const ImageWrapper = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
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
  ${media.laptop} {
    &.image-wrapper-0 {
      max-width: 646px;
    }
    &.image-wrapper-1 {
      max-width: 574px;
    }
    &.image-wrapper-2 {
      max-width: 646px;
    }
  }
  ${media.desktop} {
    &.image-wrapper-1 {
      max-width: 623px;
    }
    &.image-wrapper-2 {
      max-width: 696px;
    }
    &.image-wrapper-3 {
      max-width: 576px;
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
