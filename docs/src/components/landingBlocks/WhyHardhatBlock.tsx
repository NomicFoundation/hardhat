import React from "react";
import { styled } from "linaria/react";

import Section from "../Section";
import { media, tm, tmDark, tmSelectors } from "../../themes";

type Props = React.PropsWithChildren<{
  content: { title: string };
}>;

const Container = styled.section`
  width: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  border-left: 1px solid ${tm(({ colors }) => colors.neutral400)};
  padding-top: 52px;
  ${media.md} {
    border-left: unset;
    border-top: 1px solid ${tm(({ colors }) => colors.neutral400)};
  }
  ${tmSelectors.dark} {
    border-color: ${tmDark(({ colors }) => colors.neutral400)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      border-color: ${tmDark(({ colors }) => colors.neutral400)};
    }
  }
`;

const Title = styled.h2`
  position: absolute;
  padding: 24px;
  background-color: ${tm(({ colors }) => colors.neutral0)};
  color: ${tm(({ colors }) => colors.neutral900)};
  left: 0;
  top: 0;
  transform: translateY(-50%);
  text-transform: uppercase;
  font-size: 20px;
  font-style: normal;
  font-weight: 400;
  line-height: 24px;
  letter-spacing: 0.2em;
  margin-bottom: 32px;
  ${media.md} {
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 24px;
  }
  ${tmSelectors.dark} {
    background-color: ${tmDark(({ colors }) => colors.neutral0)};
    color: ${tmDark(({ colors }) => colors.neutral900)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-color: ${tmDark(({ colors }) => colors.neutral0)};
      color: ${tmDark(({ colors }) => colors.neutral900)};
    }
  }
`;

const TopBrackets = styled.div`
  position: absolute;
  top: 0;
  left: 24px;
  width: calc(100% - 24px);
  height: 32px;
  border-top: 1px solid ${tm(({ colors }) => colors.neutral400)};
  border-left: 1px solid ${tm(({ colors }) => colors.neutral400)};
  border-right: 1px solid ${tm(({ colors }) => colors.neutral400)};
  ${media.md} {
    height: 36px;
    border-top: none;
    width: 100%;
    border-top: none;
    left: 0;
  }
  ${tmSelectors.dark} {
    border-color: ${tmDark(({ colors }) => colors.neutral400)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      border-color: ${tmDark(({ colors }) => colors.neutral400)};
    }
  }
`;
const BottomBrackets = styled.div`
  position: absolute;
  left: 0px;
  bottom: 0;
  width: 32px;
  height: 32px;
  border-bottom: 1px solid ${tm(({ colors }) => colors.neutral400)};
  ${media.md} {
    display: none;
  }
`;

const WhyHardhatBlock = ({ content, children }: Props) => {
  return (
    <Section>
      <Container>
        <TopBrackets />
        <Title>{content.title}</Title>
        {children}
        <BottomBrackets />
      </Container>
    </Section>
  );
};

export default WhyHardhatBlock;
