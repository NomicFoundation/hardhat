import React from "react";
import { styled } from "linaria/react";
import { appTheme, tm } from "../../themes";
import useWindowSize, { WindowSizeState } from "../../hooks/useWindowSize";
import { BannerProps, DefaultBannerProps } from "./types";

const { media, breakpoints } = appTheme;

const BannerContainer = styled.section`
  position: absolute;
  top: 0;
  left: 0;
  user-select: none;
  z-index: 100;
  width: 100%;
  height: 40px;
  display: flex;
  padding: 8px;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: ${tm(({ colors }) => colors.neutral900)};
  color: ${tm(({ colors }) => colors.neutral0)};
  font-size: 13px;
  font-weight: 400;
  line-height: 15px;
  letter-spacing: 0.03em;
  white-space: nowrap;
  cursor: pointer;
  & span {
    margin-right: 2px;
  }
  & span:last-child {
    text-decoration: underline;
    margin-right: unset;
  }
  ${media.lg} {
    font-size: 18px;
    line-height: 12px;
  }
`;

const BracesContainer = styled.div`
  display: flex;
  flex-wrap: nowrap;
  & > div {
    color: ${tm(({ colors }) => colors.accent900)};
    display: inline;
    transition: color ease-out 0.5s;
    margin: 0 4px;
  }
  & .reversed {
    transform: rotate(180deg);
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
    0%,
    100% {
      color: ${tm(({ colors }) => colors.accent900)};
    }

    10% {
      color: ${tm(({ colors }) => colors.neutral900)};
    }

    20% {
      color: ${tm(({ colors }) => colors.accent900)};
    }
  }
`;

const getBracesCount = (windowSize: WindowSizeState) => {
  if (windowSize.width >= breakpoints.lg) return 6;
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
          key={Math.random()}
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
      {children}
      <div className="braces">{bracesString}</div>
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
