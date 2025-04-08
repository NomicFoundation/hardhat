import React from "react";
import { styled } from "linaria/react";
import Image from "next/image";
import Link from "next/link";
import ethereumFoundationLogo from "../assets/nomic-foundation-logo.svg";
import ethereumFoundationLogoDark from "../assets/nomic-foundation-logo-dark.svg";
import { media, tm, tmDark, tmSelectors } from "../themes";
import { PRIVACY_POLICY_PATH } from "../config";
import LandingContainer from "./LandingContainer";

// background-color: ${tm(({ colors }) => colors.neutral900)};
const Footer = styled.footer`
  padding: 90px 0;
  width: 100%;
`;
const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 34px;
  ${media.laptop} {
    flex-direction: row;
  }
`;

const Logo = styled.div`
  display: block;
  &.dark {
    display: none;
  }
  ${tmSelectors.dark} {
    &.dark {
      display: block;
    }
    &.light {
      display: none;
    }
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      &.dark {
        display: block;
      }
      &.light {
        display: none;
      }
    }
  }
`;
const SupportedBy = styled.section`
  display: flex;
  align-items: center;
  gap: 18px;
  img {
    max-height: 24px;
  }

  ${media.tablet} {
    img {
      max-height: 32px;
    }
  }
  ${media.laptop} {
    gap: 12px;
    img {
      max-height: none;
    }
  }
`;

const SupportedByTitle = styled.h2`
  color: ${tm(({ colors }) => colors.gray9)};
  font-family: Roboto, sans-serif;
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  line-height: 1.4;

  text-align: center;

  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.gray2)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.gray2)};
    }
  }
  ${media.tablet} {
    font-size: 16px;
  }
`;
const Subtitle = styled.h2`
  color: ${tm(({ colors }) => colors.gray9)};
  font-family: Roboto, sans-serif;
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  line-height: 1.4;
  letter-spacing: 0.02em;
  text-align: center;

  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.gray2)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.gray2)};
    }
  }
  ${media.tablet} {
    font-size: 14px;
  }
  ${media.laptop} {
    margin-bottom: unset;
    font-size: 16px;
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
      <LandingContainer>
        <Wrapper>
          <SupportedBy>
            <SupportedByTitle>Build by</SupportedByTitle>
            <Logo className="light">
              <Image src={ethereumFoundationLogo} alt="logo" />
            </Logo>
            <Logo className="dark">
              <Image src={ethereumFoundationLogoDark} alt="logo" />
            </Logo>
          </SupportedBy>
          <Subtitle>
            Copyright {new Date().getFullYear()} Nomic Foundation |
            <Link href={PRIVACY_POLICY_PATH} passHref>
              <PrivacyPolicyLink>Privacy Policy</PrivacyPolicyLink>
            </Link>
          </Subtitle>
        </Wrapper>
      </LandingContainer>
    </Footer>
  );
};

export default LandingFooter;
