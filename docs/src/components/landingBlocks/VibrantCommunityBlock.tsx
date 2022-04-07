import React from "react";
import Image from "next/image";
import { styled } from "linaria/react";

import VibrantCommunityImage from "../../assets/images/vibrant_community.png";

import { appTheme, tm } from "../../themes";
import CTA from "../ui/CTA";
import Section from "../Section";
import { CTAType } from "../ui/types";

const { media } = appTheme;

interface Props {
  content: { title: string; text: string; cta: CTAType };
}

const CardWrapper = styled.section`
  margin: 0 24px;
  ${media.lg} {
    margin: 0 75px 0 85px;
  }
`;

const Container = styled.div`
  padding-top: 251px;
  width: 100%;
  display: flex;
  position: relative;
  flex-direction: column;
  ${media.lg} {
    padding: 0;
    flex-direction: row;
    justify-content: center;
  }
  box-shadow: 0 6px 50px ${tm(({ colors }) => colors.cardBoxShadow)};
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  ${media.lg} {
    width: 477px;
    margin: 110px 0 40px;
  }
`;

const ImageContainer = styled.div`
  width: 346px;
  left: calc(50% - 346px / 2);
  top: -20.5px;
  position: absolute;
  ${media.lg} {
    margin-top: 43px;
    width: 530px;
    position: initial;
  }
`;

const Title = styled.h2`
  margin-bottom: 24px;
  text-align: center;
  font-size: 20px;
  line-height: 24px;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-weight: 400;
  font-family: ChivoRegular, sans-serif;
  color: ${tm(({ colors }) => colors.neutral900)};
  ${media.lg} {
    margin-left: 6px;
    text-align: left;
  }
`;

const Text = styled.p`
  margin: 0 8px 32px;
  text-align: center;
  font-size: 18px;
  line-height: 28px;
  font-weight: 400;
  font-family: ChivoLight, sans-serif;
  color: ${tm(({ colors }) => colors.neutral600)};
  ${media.lg} {
    margin: 0 6px 82px;
    text-align: left;
  }
`;

const ButtonWrapper = styled.div`
  width: 232px;
  margin-bottom: 48px;
  align-self: center;
  font-size: 15px;
  line-height: 24px;
  font-weight: 400;
  font-family: ChivoRegular, sans-serif;
  color: ${tm(({ colors }) => colors.neutral900)};

  ${media.lg} {
    align-self: start;
  }
`;

const VibrantCommunityBlock = ({ content }: Props) => {
  return (
    <Section clearPadding>
      <CardWrapper>
        <Container>
          <Wrapper>
            <Title>{content.title}</Title>
            <Text>{content.text}</Text>
            <ButtonWrapper>
              <CTA href={content.cta.url} secondary>
                {content.cta.title}
              </CTA>
            </ButtonWrapper>
          </Wrapper>
          <ImageContainer>
            <Image src={VibrantCommunityImage} alt="Vibrant community image" />
          </ImageContainer>
        </Container>
      </CardWrapper>
    </Section>
  );
};

export default VibrantCommunityBlock;
