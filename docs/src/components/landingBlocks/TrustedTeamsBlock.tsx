import React, { useMemo } from "react";
import { styled } from "linaria/react";
import Image from "next/image";

import {
  TrustedTeamsLogos,
  TrustedTeamsLogosDark,
} from "../../assets/trustedTeamsLogos/logos";

import { media, tm, tmDark, tmSelectors } from "../../themes";
import Section from "../Section";

interface Props {
  content: { title: string };
}

const Container = styled.section`
  width: 100%;
  margin-bottom: 120px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  ${media.md} {
    margin-top: 40px;
  }
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
  font-weight: normal;
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
    margin-bottom: 88px;
    font-size: 45px;
    line-height: 50px;
    letter-spacing: initial;
  }
`;

const LogosContainer = styled.div`
  display: flex;
  flex-direction: column;
  &.dark {
    display: none;
  }
  ${tmSelectors.dark} {
    &.dark {
      display: flex;
    }
    &.light {
      display: none;
    }
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      &.dark {
        display: flex;
      }
      &.light {
        display: none;
      }
    }
  }
`;

const LogosRowContainer = styled.div`
  display: flex;
  width: 10000px;

  &:nth-child(-n + 3) {
    display: none;
  }

  ${media.md} {
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

  ${media.md} {
    height: 67px;
    margin-bottom: 32px;
  }

  .image-wrapper {
    width: 100%;
    margin: 0 20px;
    height: 67px;

    ${media.md} {
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

const createLogosRows = (
  logosArray: Array<{ img: string; alt: string }>,
  rowsAmount: number
) => {
  const logosInRowAmount = Math.floor(logosArray.length / rowsAmount);
  const logosRows = [];

  for (let i = 0; i < rowsAmount; i += 1) {
    const rowImages = logosArray
      .slice(
        i * logosInRowAmount,
        (i + 1) * logosInRowAmount
        // eslint-disable-next-line
      )
      .map((logo) => (
        <div className="image-wrapper" key={logo.alt}>
          <Image src={logo.img} alt={logo.alt} title={logo.alt} />
        </div>
      ));

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
  const threeRows = useMemo(() => createLogosRows(TrustedTeamsLogos, 3), []);
  const fiveRows = useMemo(() => createLogosRows(TrustedTeamsLogos, 5), []);

  const threeRowsDark = useMemo(
    () => createLogosRows(TrustedTeamsLogosDark, 3),
    []
  );
  const fiveRowsDark = useMemo(
    () => createLogosRows(TrustedTeamsLogosDark, 5),
    []
  );

  return (
    <Section clearPadding>
      <Container>
        <Title>{content.title}</Title>
        <LogosContainer className="light">
          {threeRows}
          {fiveRows}
        </LogosContainer>
        <LogosContainer className="dark">
          {threeRowsDark}
          {fiveRowsDark}
        </LogosContainer>
      </Container>
    </Section>
  );
};

export default TrustedTeamsBlock;
