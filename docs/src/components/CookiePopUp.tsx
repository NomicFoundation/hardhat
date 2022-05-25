import React from "react";
import { styled } from "linaria/react";
import { media, tm, tmDark, tmHCDark, tmSelectors } from "../themes";
import homepageContent from "../content/home";
import CTA from "./ui/CTA";

const Container = styled.section`
  z-index: 100;
  position: fixed;
  bottom: 24px;
  right: 0px;
  width: auto;
  padding: 60px 50px 40px;
  border-radius: 4px;
  background-color: ${tm(({ colors }) => colors.cookiePopUpBackground)};
  box-shadow: 0px 6px 50px ${tm(({ colors }) => colors.cookieShadow)};
  filter: drop-shadow(
    0px 6px 50px ${tm(({ colors }) => colors.cookieDropShadow)}
  );
  display: flex;
  flex-direction: column;
  margin: 0px 24px;
  max-width: 630px;
  ${media.md} {
    width: 630px;
  }
  ${tmSelectors.dark} {
    background-color: ${tmDark(({ colors }) => colors.cookiePopUpBackground)};
  }

  ${tmSelectors.hcDark} {
    background-color: ${tmHCDark(({ colors }) => colors.cookiePopUpBackground)};
  }

  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-color: ${tmDark(({ colors }) => colors.cookiePopUpBackground)};
    }
  }
`;

const Title = styled.h3`
  font-weight: 400;
  font-size: 20px;
  line-height: 24px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: ${tm(({ colors }) => colors.neutral900)};
  mix-blend-mode: normal;
  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral900)};
  }

  ${tmSelectors.hcDark} {
    color: ${tmHCDark(({ colors }) => colors.neutral900)};
  }

  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.neutral900)};
    }
  }
`;

const Text = styled.p`
  font-family: ChivoLight;
  margin-top: 16px;
  font-weight: 400;
  font-size: 16px;
  line-height: 28px;
  color: ${tm(({ colors }) => colors.cookieTextColor)};

  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.cookieTextColor)};
  }

  ${tmSelectors.hcDark} {
    color: ${tmHCDark(({ colors }) => colors.cookieTextColor)};
  }

  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.cookieTextColor)};
    }
  }
`;

const ButtonsContainer = styled.div`
  display: flex;
  margin-top: 32px;

  & .secondary {
    ${tmSelectors.dark} {
      color: ${tmDark(({ colors }) => colors.cookieTextColor)};
    }

    ${tmSelectors.hcDark} {
      color: ${tmHCDark(({ colors }) => colors.cookieTextColor)};
    }

    ${media.mqDark} {
      ${tmSelectors.auto} {
        color: ${tmDark(({ colors }) => colors.cookieTextColor)};
      }
    }
  }
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
  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral900)};
  }

  ${tmSelectors.hcDark} {
    color: ${tmHCDark(({ colors }) => colors.neutral900)};
  }

  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.neutral900)};
    }
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
            variant="full-padding"
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
