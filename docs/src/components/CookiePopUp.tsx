import React from "react";
import { styled } from "linaria/react";
import { media, tm, tmDark, tmSelectors } from "../themes";
import CTA from "./ui/CTA";

const Container = styled.section`
  z-index: 100;
  position: fixed;
  bottom: 16px;
  right: 0;
  margin: 0 16px;
  width: calc(100% - 32px);
  padding: 24px 24px 16px;
  background-color: ${tm(({ colors }) => colors.cookiePopUpBackground)};
  box-shadow: 0px 0px 6px 0px ${tm(({ colors }) => colors.cookieShadow)};
  display: flex;
  flex-direction: column;
  max-width: 100%;
  font-family: "Source Code Pro", monospace;
  ${media.smd} {
    margin: 0 24px;
    bottom: 24px;
    max-width: 332px;
  }
  ${tmSelectors.dark} {
    background-color: ${tmDark(({ colors }) => colors.cookiePopUpBackground)};
    box-shadow: 0px 0px 6px 0px ${tmDark(({ colors }) => colors.cookieShadow)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-color: ${tmDark(({ colors }) => colors.cookiePopUpBackground)};
      box-shadow: 0px 0px 6px 0px ${tmDark(({ colors }) => colors.cookieShadow)};
    }
  }
`;

const Title = styled.h3`
  font-weight: 700;
  font-size: 12px;
  line-height: 1.5;
  letter-spacing: 0.05em;
  color: ${tm(({ colors }) => colors.gray8b)};

  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.gray2)};
  }

  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.gray2)};
    }
  }
`;

const Text = styled.p`
  margin-top: 8px;
  font-weight: 400;
  font-size: 10px;
  line-height: 1.5;
  font-family: Roboto, sans-serif;
  letter-spacing: 0.045em;
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
  &:first-child {
    margin-right: 16px;
  }
`;

const ReadMoreLink = styled.a`
  margin-left: 4px;
  cursor: pointer;
  &:hover {
    opacity: 0.8;
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
          <CTA variant="secondary sm" onClick={onReject}>
            Reject all
          </CTA>
        </CTAWrapper>
        <CTAWrapper>
          <CTA variant="sm" onClick={onAccept}>
            Accept all
          </CTA>
        </CTAWrapper>
      </ButtonsContainer>
    </Container>
  );
};

export default CookiePopUp;
