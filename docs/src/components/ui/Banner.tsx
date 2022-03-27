import React, { useState, useEffect } from "react";
import { styled } from "linaria/react";
import { appTheme, tm } from "../../themes";
import useWindowSize from "../../hooks/useWindowSize";

const content = {
  text: "Join the Hardhat team! Nomic Labs is hiring",
  href: "https://www.notion.so/Nomic-Foundation-jobs-991b37c547554f75b89a95f437fd5056",
};

type BannerProps = React.PropsWithChildren<{
  content: typeof content;
}>;

interface DefaultBannerProps {
  content: typeof content;
}

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
  font-style: normal;
  font-weight: 400;
  line-height: 15px;
  letter-spacing: 0.03em;
  &:hover {
    cursor: pointer;
  }
  & span {
    margin-right: 2px;
  }
  & span:last-child {
    text-decoration: underline;
    margin-right: unset;
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

const Brace = styled.div`
  display: inline;
  &[data-highlighted="true"] {
    color: ${tm(({ colors }) => colors.neutral900)};
    transition: color ease-out 0.5s;
  }
`;

const BracesAnimation: React.FC<React.PropsWithChildren<{}>> = ({
  children,
}) => {
  const [animationCounter, setAnimationCounter] = useState(0);
  const [isAnimationPlaying, setAnimationState] = useState(true);

  const windowSize = useWindowSize();
  const { breakpoints } = appTheme;
  const bracesCount =
    windowSize.width >= breakpoints.lg
      ? 6
      : windowSize.width > breakpoints.sm
      ? 3
      : 2;
  const bracesString = Array(bracesCount)
    .fill(">")
    .map((brace: string, index: number) => {
      return (
        <Brace
          key={index}
          data-highlighted={
            isAnimationPlaying && index === animationCounter % bracesCount
          }
        >
          {brace}
        </Brace>
      );
    });

  useEffect(() => {
    const interval = setInterval(
      () =>
        setAnimationCounter((currentCounter) => {
          if (currentCounter + 1 - bracesCount * 3 >= 0) {
            setAnimationState(false);
            clearInterval(interval);
          }
          return currentCounter + 1;
        }),
      300
    );

    return () => clearInterval(interval);
  }, [bracesCount]);

  return (
    <BracesContainer>
      <div className="braces reversed">{bracesString}</div>
      {children}
      <div className="braces">{bracesString}</div>
    </BracesContainer>
  );
};

const DefaultBanner = ({ content }: DefaultBannerProps) => {
  return (
    <BracesAnimation>
      {content.text.split(" ").map((word: string, index: number) => (
        <span key={`${word}-${index}`}>{word}</span>
      ))}
    </BracesAnimation>
  );
};

const Banner = (props: BannerProps) => {
  const { children, content } = props;
  return (
    <a target="_blank" rel="noreferrer" href={content.href}>
      <BannerContainer>
        {Array.isArray(children) && children[0]({ content })}
      </BannerContainer>
    </a>
  );
};

export default React.memo(Banner);

Banner.defaultProps = { content, children: [DefaultBanner] };
