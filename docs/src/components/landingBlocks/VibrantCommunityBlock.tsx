import React from "react";
import { styled } from "linaria/react";
import Image from "next/image";

import { media, tm } from "../../themes";
import CTA from "../ui/CTA";
import Section from "../Section";
import { CTAType } from "../ui/types";

interface Props {
  content: { title: string; text: string; imageUrl: string; cta: CTAType };
}

const CardWrapper = styled.section`
  margin: 96px 24px 0;

  ${media.md} {
    margin: 0 75px 50px 85px;
  }
`;

const Container = styled.div`
  padding-top: 72%;
  width: 100%;
  display: flex;
  position: relative;
  flex-direction: column;
  ${media.md} {
    padding: 0;
    flex-direction: row-reverse;
    justify-content: center;
  }
  box-shadow: 0 6px 50px ${tm(({ colors }) => colors.cardBoxShadow)};
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  ${media.md} {
    width: 477px;
    margin: 110px 0 40px;
  }
`;

const ImageContainer = styled.div`
  width: 116%;
  height: 100%;
  position: absolute;
  height: auto;
  transform: translateX(-7%);
  top: -16px;
  & .img {
    position: relative !important;
    height: unset !important;
  }
  & span {
    padding: 0 !important;
  }

  ${media.md} {
    margin-top: 43px;
    width: 530px;
    max-height: none;
    height: 366px;
    position: relative;
    top: 0;
    left: 0;
    transform: scale(1);
  }
`;

const Title = styled.h2`
  margin-top: 36px;
  margin-bottom: 24px;
  text-align: center;
  font-size: 20px;
  line-height: 24px;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-weight: 400;
  color: ${tm(({ colors }) => colors.neutral900)};
  ${media.md} {
    margin-top: 0px;
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

  ${media.md} {
    margin: 0 0 82px;
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
  & > a {
    font-size: 15px;
  }

  ${media.md} {
    align-self: start;
  }
`;

const VibrantCommunityBlock = ({ content }: Props) => {
  return (
    <Section clearPadding>
      <CardWrapper>
        <Container>
          <ImageContainer>
            <Image
              className="img"
              src={content.imageUrl}
              layout="responsive"
              objectFit="contain"
              width="100%"
              height="100%"
              quality={100}
              alt="Vibrant community image"
            />
          </ImageContainer>
          <Wrapper>
            <Title>{content.title}</Title>
            <Text>{content.text}</Text>
            <ButtonWrapper>
              <CTA href={content.cta.url} variant="secondary">
                {content.cta.title}
              </CTA>
            </ButtonWrapper>
          </Wrapper>
        </Container>
      </CardWrapper>
    </Section>
  );
};

export default VibrantCommunityBlock;
