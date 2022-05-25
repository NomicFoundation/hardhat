import React from "react";
import { styled } from "linaria/react";
import { tm } from "../themes";
import homepageContent from "../content/home";
import CTA from "./ui/CTA";

const Container = styled.section`
  width: 630px;
  padding: 60px 50px 40px;
  background-color: ${tm(({ colors }) => colors.cookiePopUpBackground)};
  display: flex;
  flex-direction: column;
`;

const Title = styled.h3`
  font-weight: 400;
  font-size: 20px;
  line-height: 24px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: ${tm(({ colors }) => colors.neutral900)};
  mix-blend-mode: normal;
`;

const Text = styled.p`
  font-family: ChivoLight;
  margin-top: 16px;
  font-weight: 400;
  font-size: 16px;
  line-height: 28px;
  color: ${tm(({ colors }) => colors.cookieTextColor)};
`;

const ButtonsContainer = styled.div`
  display: flex;
  margin-top: 32px;
`;

const CTAWrapper = styled.div`
  &:first-child {
    margin-right: 32px;
  }
`;

const ReadMoreLink = styled.a`
  font-family: ChivoRegular;
  color: ${tm(({ colors }) => colors.neutral900)};
  font-weight: 800;
  margin-left: 6px;
  cursor: pointer;
  &:hover {
    opacity: 0.8;
  }
`;

interface Props {
  content: typeof homepageContent.cookiePopUp;
  closePopUp: () => void;
}

const CookiePopUp = ({ content, closePopUp }: Props) => {
  return (
    <Container>
      <Title>{content.title}</Title>
      <Text>
        {content.text}
        <ReadMoreLink href={content.readMoreHref}>Read More</ReadMoreLink>
      </Text>
      <ButtonsContainer>
        <CTAWrapper>
          <CTA
            href=""
            variant="secondary full-padding"
            onClick={() => {
              closePopUp();
            }}
          >
            Reject all
          </CTA>
        </CTAWrapper>
        <CTAWrapper>
          <CTA
            href=""
            onClick={() => {
              closePopUp();
            }}
          >
            Accept all
          </CTA>
        </CTAWrapper>
      </ButtonsContainer>
    </Container>
  );
};

export default CookiePopUp;
