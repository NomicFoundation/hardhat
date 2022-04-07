import React from "react";
import { styled } from "linaria/react";

import Section from "../Section";
import { tm, appTheme } from "../../themes";

const { media } = appTheme;

type Props = React.PropsWithChildren<{
  content: { title: string };
}>;

const Container = styled.section`
  width: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${tm(({ colors }) => colors.neutral400)};
  border-left: 1px solid ${tm(({ colors }) => colors.neutral400)};
  padding-top: 52px;
  margin-top: 130px;
  ${media.lg} {
    border-left: unset;
  }
`;

const Title = styled.h2`
  position: absolute;
  padding: 24px;
  background-color: ${tm(({ colors }) => colors.neutral0)};
  left: 0;
  top: 0;
  transform: translateY(-50%);
  text-transform: uppercase;
  font-size: 20px;
  font-style: normal;
  font-weight: 400;
  line-height: 24px;
  letter-spacing: 0.2em;
  ${media.lg} {
    left: 50%;
    transform: translate(-50%, -50%);
  }
`;

const TopBrackets = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 32px;
  border-left: 1px solid ${tm(({ colors }) => colors.neutral400)};
  border-right: 1px solid ${tm(({ colors }) => colors.neutral400)};
  ${media.lg} {
    height: 36px;
  }
`;
const BottomBrackets = styled.div`
  position: absolute;
  left: 0;
  bottom: 0;
  width: 32px;
  height: 32px;
  border-bottom: 1px solid ${tm(({ colors }) => colors.neutral400)};
  ${media.lg} {
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
