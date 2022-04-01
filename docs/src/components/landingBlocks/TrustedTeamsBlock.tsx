import React, { useMemo } from "react";
import { styled } from "linaria/react";

import TrustedTeamsLogos from "./TrustedTeamsBlock.model";

import { appTheme, tm } from "../../themes";
import Section from "../Section";
import defaultProps from "../ui/default-props";

interface Props {
  content: typeof defaultProps.defaultTrustedTeamsBlockContent;
}

const { media } = appTheme;

const Container = styled.section`
  width: 100%;
  margin-bottom: 120px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Title = styled.h2`
  padding: 16px 20px;
  margin-bottom: 48px;
  text-align: center;
  font-size: 28px;
  line-height: 32px;
  font-weight: 400;
  letter-spacing: -0.01em;
  font-family: ChivoBold, sans-serif;
  color: ${tm(({ colors }) => colors.neutral900)};

  ${media.lg} {
    margin-bottom: 88px;
    font-size: 45px;
    line-height: 50px;
    letter-spacing: initial;
  }
`;

const LogosContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const LogosRowContainer = styled.div`
  display: flex;
  width: 10000px;

  &:nth-child(-n + 3) {
    display: none;
  }

  ${media.lg} {
    &:nth-child(-n + 3) {
      display: initial;
    }
    &:nth-last-child(-n + 5) {
      display: none;
    }
  }
`;

const LogosSubrowContainer = styled.div`
  height: 72px;
  display: flex;
  align-items: center;
  animation-duration: 50s;
  animation-name: marquee;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  animation-direction: initial;
  float: left;

  &[data-reverted="true"] {
    animation-direction: reverse;
  }

  &.changed-speed {
    animation-duration: 32s;
  }

  ${media.lg} {
    height: 67px;
    margin-bottom: 32px;
  }

  & img {
    width: 100%;
    margin: 0 20px;
    max-height: 67px;
    height: 41px;

    ${media.lg} {
      height: initial;
      margin: 0 50px;
    }
  }

  @keyframes marquee {
    0% {
      transform: translateX(0);
    }

    100% {
      transform: translateX(-100%);
    }
  }
`;

const createLogosRows = (rowsAmount: number) => {
  const logosInRowAmount = Math.floor(TrustedTeamsLogos.length / rowsAmount);
  const logosRows = [];

  for (let i = 0; i < rowsAmount; i += 1) {
    const rowImages = TrustedTeamsLogos.slice(
      i * logosInRowAmount,
      (i + 1) * logosInRowAmount
      // eslint-disable-next-line
    ).map((logo) => <img src={logo.img.src} alt={logo.alt} key={logo.alt} />);

    logosRows.push(
      <LogosRowContainer key={i + rowsAmount}>
        <LogosSubrowContainer
          data-reverted={i % 2 !== 0}
          className={rowsAmount === 3 && i === 2 ? "changed-speed" : ""}
        >
          {rowImages}
        </LogosSubrowContainer>
        <LogosSubrowContainer
          data-reverted={i % 2 !== 0}
          className={rowsAmount === 3 && i === 2 ? "changed-speed" : ""}
        >
          {rowImages}
        </LogosSubrowContainer>
      </LogosRowContainer>
    );
  }
  return logosRows;
};

const TrustedTeamsBlock = ({ content }: Props) => {
  const threeRows = useMemo(() => createLogosRows(3), []);
  const fiveRows = useMemo(() => createLogosRows(5), []);

  return (
    <Section clearPadding>
      <Container>
        <Title>{content.title}</Title>
        <LogosContainer>
          {threeRows}
          {fiveRows}
        </LogosContainer>
      </Container>
    </Section>
  );
};

export default TrustedTeamsBlock;
