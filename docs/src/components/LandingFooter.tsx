import React from "react";
import { styled } from "linaria/react";
import Image from "next/image";
import Link from "next/link";
import ethereumFoundationLogo from "../assets/nomic-foundation-logo.svg";
import ethereumFoundationLogoDark from "../assets/nomic-foundation-logo.svg";
import { media, tm, tmDark, tmSelectors } from "../themes";
import { PRIVACY_POLICY_PATH } from "../config";

// background-color: ${tm(({ colors }) => colors.neutral900)};
const Footer = styled.footer`
  background-color: ${tmDark(({ colors }) => colors.neutral900)};
  padding: 140px 256px 140px;
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  & .light {
    display: inline;
  }
  & .dark {
    display: none;
  }
  ${tmSelectors.dark} {

    background-color: ${tm(({ colors }) => colors.neutral900)};
    & .light {
      display: none;
    }
    & .dark {
      display: inline;
    }
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-color: ${tm(({ colors }) => colors.neutral900)};

      & .light {
        display: none;
      }
      & .dark {
        display: inline;
      }
    }
  }
`;

const SupportedBy = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  ${media.md} {
    flex-direction: row;
  }
`;

const Subtitle = styled.h2`

  color: ${tmDark(({ colors }) => colors.footerText)};
  font-family: Roboto;
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  line-height: 24px;
  letter-spacing: 0.8px;
  text-align: center;
  margin-bottom: 16px;
  font-family: ChivoLight, sans-serif;
  ${media.md} {
    margin-bottom: unset;
    margin-right: 24px;
    font-size: 24px;
  }
  ${tmSelectors.dark} {
    color: ${tm(({ colors }) => colors.footerText)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.footerText)};
    }
  }
`;

const Legal = styled.section`
  margin-top: 80px;
  padding-top: 21px;
  position: relative;
  font-size: 12px;
  line-height: 12px;
  letter-spacing: 0;
  text-align: center;
  color: ${tm(({ colors }) => colors.footerText2)};
  &:before {
    content: " ";
    height: 1px;
    width: 186px;
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    background-color: ${tm(({ colors }) => colors.footerText2)};
  }
  ${media.md} {
    font-size: 15px;
    line-height: 24px;
    margin-top: 96px;
  }
  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.footerText2)};
    &:before {
      background-color: ${tmDark(({ colors }) => colors.footerText2)};
    }
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      &:before {
        background-color: ${tmDark(({ colors }) => colors.footerText2)};
      }
      color: ${tmDark(({ colors }) => colors.footerText2)};
    }
  }
`;

const PrivacyPolicyLink = styled.a`
  cursor: pointer;
  margin-left: 4px;
  &:hover {
    opacity: 0.8;
  }
`;

const LandingFooter = () => {
  return (
    <Footer>
      <SupportedBy>
        <Subtitle>Build with</Subtitle>
        <Image src={ethereumFoundationLogo} alt="logo" />
      </SupportedBy>
      <Subtitle>
        Copyright {new Date().getFullYear()} Nomic Foundation |
        <Link href={PRIVACY_POLICY_PATH} passHref>
          <PrivacyPolicyLink>Privacy Policy</PrivacyPolicyLink>
        </Link>
      </Subtitle>
    </Footer>
  );
};

export default LandingFooter;
