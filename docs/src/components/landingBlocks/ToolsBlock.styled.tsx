import { styled } from "linaria/react";
import { media, tm } from "../../themes";

const Container = styled.div`
  margin-top: 70px;
  display: flex;
  flex-direction: column;
  position: relative;

  &:before {
    width: 100%;
    height: 32px;
    top: -32px;
    content: "";
    position: absolute;
    background: ${tm(({ colors }) => colors.neutral0)};
    border-top: 1px solid ${tm(({ colors }) => colors.toolsBlockBorder)};
    border-right: 1px solid #d4d4d4;
  }

  &:after {
    content: "";
    position: absolute;
    height: 32px;
    width: 100%;
    right: 0;
    bottom: -44px;
    border-top: 1px solid ${tm(({ colors }) => colors.toolsBlockBorder)};
    border-right: 1px solid ${tm(({ colors }) => colors.toolsBlockBorder)};
    transform: rotate(180deg);
  }

  ${media.lg} {
    flex-direction: row;

    &:before {
      width: 36px;
      height: 100%;
      border-left: 1px solid ${tm(({ colors }) => colors.toolsBlockBorder)};
      border-bottom: 1px solid ${tm(({ colors }) => colors.toolsBlockBorder)};
      border-right: none;
      top: 0;
    }

    &:after {
      top: 0;
      width: 36px;
      height: 100%;
      bottom: unset;
      border-left: 1px solid ${tm(({ colors }) => colors.toolsBlockBorder)};
      border-bottom: 1px solid ${tm(({ colors }) => colors.toolsBlockBorder)};
      border-right: none;
    }
  }
`;

const ToolsIconsBlock = styled.div`
  position: relative;

  &:before {
    position: absolute;
    content: "";
    width: 172px;
    height: 1px;
    left: calc(50% - 86px);
    bottom: 0;
    background: ${tm(({ colors }) => colors.toolsBlockBorder)};
  }

  &:after {
    position: absolute;
    content: "";
    bottom: -5px;
    right: calc(50% - 5px);
    width: 10px;
    height: 10px;
    background: ${tm(({ colors }) => colors.neutral0)};
    border-top: 1px solid ${tm(({ colors }) => colors.toolsBlockBorder)};
    border-left: 1px solid ${tm(({ colors }) => colors.toolsBlockBorder)};
    transform: translateY(0) rotate(225deg);
  }

  ${media.lg} {
    width: 50%;
    padding: 40px;

    &:before {
      right: 0;
      top: calc(50% - 116px);
      left: unset;
      height: 232px;
      width: 1px;
      background: ${tm(({ colors }) => colors.toolsBlockBorder)};
    }

    &:after {
      top: calc(50% - 5px);
      right: -5px;
      bottom: unset;
      transform: rotate(135deg);
    }
  }
`;

const IconsBlockTitle = styled.h2`
  margin-bottom: 24px;
  font-family: ChivoRegular, sans-serif;
  font-weight: 400;
  font-size: 20px;
  line-height: 24px;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: ${tm(({ colors }) => colors.neutral900)};
`;

const ButtonsContainer = styled.div`
  height: 236px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-row-gap: 12px;
  justify-content: space-around;
`;

const ButtonContainer = styled.div`
  position: relative;
  height: 88px;
  max-width: 162px;
  width: 100%;
  justify-self: center;
  padding: 12px 0 12px 6px;
  display: flex;
  border-radius: 4px;
  align-items: center;
  white-space: nowrap;
  cursor: pointer;

  &.active {
    box-shadow: 6px -2px 10px #eee3ff, -6px 2px 10px #fbfcdb;
  }

  & svg {
    width: 42px;
    height: 42px;
    transition-duration: 0.1s;
    border-radius: 8px;
    box-shadow: 0 1px 2px ${tm(({ colors }) => colors.sliderButtonHoverShadow)};

    &.active {
      width: 50px;
      height: 50px;
      box-shadow: none;
    }
  }
`;

const ButtonNameContainer = styled.div`
  margin-left: 16px;
`;

const ButtonCompanyName = styled.span`
  font-size: 14px;
  font-family: ChivoLight, sans-serif;
  color: ${tm(({ colors }) => colors.neutral600)};
  font-weight: 800;
`;

const ButtonToolName = styled.span`
  height: 24px;
  font-size: 15px;
  font-family: ChivoLight, sans-serif;
  color: #0a0a0a;
  line-height: 24px;
  font-weight: 800;
`;

const DescriptionContainer = styled.div`
  margin-top: 40px;
  padding: 0 24px;

  ${media.lg} {
    width: 50%;
  }
`;

const DescriptionHeaderContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 16px;
  font-family: ChivoLight, sans-serif;
  font-weight: 600;

  ${media.lg} {
    flex-direction: row;
  }
`;

const DescriptionTitle = styled.h3`
  margin-bottom: 8px;
  font-size: 24px;
  white-space: nowrap;
  line-height: 32px;
  color: ${tm(({ colors }) => colors.neutral600)};
`;

const DescriptionTitleTool = styled.span`
  color: ${tm(({ colors }) => colors.neutral900)};
`;

const DescriptionMottoContainer = styled.div`
  padding: 0 12px;
  height: 27px;
  font-size: 13px;
  text-transform: uppercase;
  line-height: 27px;
  letter-spacing: 1px;
  font-family: ChivoLight, sans-serif;
  font-weight: 600;
  color: ${tm(({ colors }) => colors.neutral600)};
  border-radius: 8px 0;

  &.runner {
    background-color: ${tm(({ colors }) => colors.mottoRunnerBackground)};
  }

  &.network {
    background-color: ${tm(({ colors }) => colors.mottoNetworkBackground)};
  }

  &.ignition {
    background-color: ${tm(({ colors }) => colors.mottoIgnitionBackground)};
  }

  &.vscode {
    background-color: ${tm(({ colors }) => colors.mottoVscodeBackground)};
  }

  ${media.lg} {
    margin-left: 24px;
  }
`;

const DescriptionText = styled.p`
  margin-bottom: 24px;
  width: 100%;
  font-size: 18px;
  line-height: 28px;
  font-family: ChivoLight, sans-serif;
  color: ${tm(({ colors }) => colors.neutral600)};
`;

const DescriptionLink = styled.a`
  position: relative;
  font-size: 15px;
  font-weight: 500;
  color: ${tm(({ colors }) => colors.neutral600)};

  &:after {
    content: "";
    position: absolute;
    width: 7px;
    height: 7px;
    background: #fff;
    border-top: 1px solid #6e6f70;
    border-left: 1px solid #6e6f70;
    right: -18px;
    top: calc(50% - 3px);
    transform: rotate(135deg);
    transition: all 0.1s ease-in-out;
  }
`;

const ToolsBlockStyled = {
  Container,
  ToolsIconsBlock,
  IconsBlockTitle,
  ButtonsContainer,
  ButtonContainer,
  ButtonNameContainer,
  ButtonCompanyName,
  ButtonToolName,
  DescriptionContainer,
  DescriptionHeaderContainer,
  DescriptionTitle,
  DescriptionTitleTool,
  DescriptionMottoContainer,
  DescriptionText,
  DescriptionLink,
};

export default ToolsBlockStyled;
