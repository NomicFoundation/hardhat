import React from "react";
import { styled } from "linaria/react";
import Image from "next/image";
import Section from "../Section";
import { media, tm, tmDark, tmSelectors } from "../../themes";
import LandingContainer from "../LandingContainer";
import lines from "../../assets/why-we/lines.svg";

type Props = React.PropsWithChildren<{
  content: { title: string; footer: { title: string; text: string } };
}>;

const Container = styled.section`
  width: 100%;
  position: relative;
  padding-top: 92px;
  padding-bottom: 105px;
`;

const Title = styled.h2`
  color: ${tm(({ colors }) => colors.neutral900)};
  text-transform: capitalize;
  font-size: 49px;
  font-weight: 600;
  font-family: SourceCodePro, sans-serif;
  line-height: 1.2;
  letter-spacing: 0.045em;
  margin-bottom: 52px;

  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral900)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.neutral900)};
    }
  }
`;

const Heading = styled.div`
  position: relative;
`;

const TitleBrackets = styled.div`
  position: absolute;
  top: 50%;
  margin-top: -49px;
  right: calc(100% + 26px);
  width: 232px;
  height: 99px;
`;

const CardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 208px;
`;

const BottomWrapper = styled.div`
  padding: 66px 0;
  text-align: center;
  position: relative;
`;

const BottomWrapperTitle = styled.div`
  font-size: 31px;
  fweight: 500;
  font-family: SourceCodePro, sans-serif;
  line-height: 1.2;
  letter-spacing: 0.05em;
  color: ${tm(({ colors }) => colors.neutral900)};
  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral900)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.neutral900)};
    }
  }
`;

const BottomWrapperText = styled.div`
  font-size: 20px;
  fweight: 400;
  font-family: Roboto, sans-serif;
  line-height: 1.2;
  margin-top: 16px;
  letter-spacing: 0.05em;
  color: #8e9094;
`;

const WhyHardhatBlock = ({ content, children }: Props) => {
  return (
    <Section clearPadding>
      <Container>
        <LandingContainer>
          <Heading>
            <Title>{content.title}</Title>
            <TitleBrackets>
              <Image src={lines} alt="lines" />
            </TitleBrackets>
          </Heading>
          <CardList>{children}</CardList>
        </LandingContainer>
      </Container>
      <BottomWrapper>
        <LandingContainer>
          <BottomWrapperTitle>{content.footer.title}</BottomWrapperTitle>
          <BottomWrapperText>{content.footer.text}</BottomWrapperText>
        </LandingContainer>
      </BottomWrapper>
    </Section>
  );
};

export default WhyHardhatBlock;
