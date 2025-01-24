import React from "react";
import { styled } from "linaria/react";
import { media, tm, tmDark, tmSelectors } from "../themes";
import CTA from "./ui/CTA";

const Container = styled.section`
  z-index: 100;
  position: fixed;
  bottom: 24px;
  right: 0px;
  width: auto;
  padding: 16px 20px;
  border-radius: 4px;
  margin: 0px 24px;
  background-color: ${tm(({ colors }) => colors.cookiePopUpBackground)};
  box-shadow: 0px 6px 50px ${tm(({ colors }) => colors.cookieShadow)};
  filter: drop-shadow(
    0px 6px 50px ${tm(({ colors }) => colors.cookieDropShadow)}
  );
  display: flex;
  flex-direction: column;
  max-width: 332px;
  ${media.md} {
    width: 332px;
    margin: 0px 24px;
    left: unset;
  }
  ${tmSelectors.dark} {
    background-color: ${tmDark(({ colors }) => colors.cookiePopUpBackground)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-color: ${tmDark(({ colors }) => colors.cookiePopUpBackground)};
    }
  }
`;

const Title = styled.h3`
  font-weight: 400;
  font-size: 12px;
  line-height: 24px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: ${tm(({ colors }) => colors.neutral900)};
  mix-blend-mode: normal;
  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral900)};
  }

  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.neutral900)};
    }
  }
`;

const Text = styled.p`
  font-family: ChivoLight, sans-serif;
  margin-top: 16px;
  font-weight: 400;
  font-size: 12px;
  line-height: 140%;
  color: ${tm(({ colors }) => colors.cookieTextColor)};

  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.cookieTextColor)};
  }

  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.cookieTextColor)};
    }
  }
`;

const ButtonsContainer = styled.div`
  display: flex;
  margin-top: 16px;

  & .secondary {
    ${tmSelectors.dark} {
      color: ${tmDark(({ colors }) => colors.cookieTextColor)};
    }

    ${media.mqDark} {
      ${tmSelectors.auto} {
        color: ${tmDark(({ colors }) => colors.cookieTextColor)};
      }
    }
  }
`;

const CTAWrapper = styled.div`
  & > button {
    font-size: 10px;
    padding: 10px 12px;
    height: 32px;
  }
  &:first-child {
    margin-right: 16px;
  }
`;

const ReadMoreLink = styled.a`
  font-family: ChivoRegular, sans-serif;
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
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.neutral900)};
    }
  }
`;

interface Props {
  title: string;
  text: string;
  readMoreHref: string;
  onAccept: () => void;
  onReject: () => void;
}

const CookiePopUp = ({
  title,
  text,
  readMoreHref,
  onAccept,
  onReject,
}: Props) => {
  return (
    <Container>
      <Title>{title}</Title>
      <Text>
        {text}
        <ReadMoreLink href={readMoreHref}>Read More</ReadMoreLink>
      </Text>
      <ButtonsContainer>
        <CTAWrapper>
          <CTA variant="secondary" onClick={onReject}>
            Reject all
          </CTA>
        </CTAWrapper>
        <CTAWrapper>
          <CTA onClick={onAccept}>Accept all</CTA>
        </CTAWrapper>
      </ButtonsContainer>
    </Container>
  );
};

export default CookiePopUp;
