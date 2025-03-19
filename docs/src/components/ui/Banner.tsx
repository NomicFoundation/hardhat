import React from "react";
import { styled } from "linaria/react";
import { breakpoints, media, tm, tmDark, tmSelectors } from "../../themes";
import useWindowSize, { WindowSizeState } from "../../hooks/useWindowSize";
import { BannerProps, DefaultBannerProps } from "./types";

const BannerContainer = styled.section`
  font-family: SourceCodePro, sans-serif;
  user-select: none;
  z-index: 100;
  width: 100%;
  height: 40px;
  display: flex;
  padding: 8px 8px;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: ${tm(({ colors }) => colors.neutral900)};
  color: ${tm(({ colors }) => colors.neutral0)};
  font-size: 10px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.044em;
  white-space: nowrap;
  cursor: pointer;
  & span {
    margin-right: 2px;
  }
  ${media.md} {
    font-size: 16px;
  }
  ${tmSelectors.dark} {
    background-color: ${tmDark(({ colors }) => colors.neutral900)};
    color: ${tmDark(({ colors }) => colors.neutral0)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-color: ${tmDark(({ colors }) => colors.neutral900)};
      color: ${tmDark(({ colors }) => colors.neutral0)};
    }
  }
`;

const BracesContainer = styled.div`
  display: flex;

  flex-wrap: nowrap;
  align-items: baseline;
  & > .braces {
    color: ${tm(({ colors }) => colors.accent900)};
    display: inline;
    transition: color ease-out 0.5s;
    margin: 0 8px;
  }
  & .reversed {
    transform: rotate(180deg);
  }
  & .text {
    ${media.md} {
      padding: 0px 16px;
    }
  }
`;

const Brace = styled.div<{
  fullAnimationDuration: number;
  braceNumber: number;
}>`
  display: inline;
  animation: highlight ease-out ${(props) => `${props.fullAnimationDuration}s`};
  animation-iteration-count: 3;
  animation-delay: ${(props) => `${props.braceNumber * 0.5}s`};
  @keyframes highlight {
    10% {
      opacity: 0;
    }

    20% {
      opacity: 1;
    }
  } ;
`;

const getBracesCount = (windowSize: WindowSizeState) => {
  if (windowSize.width >= breakpoints.md) return 6;
  if (windowSize.width >= breakpoints.sm) return 3;
  return 2;
};

const BracesAnimation: React.FC<React.PropsWithChildren<{}>> = ({
  children,
}) => {
  const windowSize = useWindowSize();
  const bracesCount = getBracesCount(windowSize);

  const bracesString = Array(bracesCount)
    .fill(">")
    .map((brace: string, index: number) => {
      return (
        <Brace
          key={index}
          fullAnimationDuration={bracesCount * 0.5}
          braceNumber={index + 1}
        >
          {brace}
        </Brace>
      );
    });

  return (
    <BracesContainer>
      <div className="braces reversed">{bracesString}</div>
      <div className="text">{children}</div>
      <div className="braces ">{bracesString}</div>
    </BracesContainer>
  );
};

export const DefaultBanner = ({ content }: DefaultBannerProps) => {
  return <BracesAnimation>{content.text}</BracesAnimation>;
};

const Banner = ({ content, renderContent }: BannerProps) => {
  return (
    <a target="_blank" rel="noreferrer" href={content.href}>
      <BannerContainer>{renderContent({ content })}</BannerContainer>
    </a>
  );
};

export default Banner;
