import { styled } from "linaria/react";
import React from "react";
import Link from "next/link";
import EthereumFoundationLogo from "../assets/ethereum-foundation-logo";
import { media, tm } from "../themes";
import { PRIVACY_POLICY_PATH } from "../config";

const Footer = styled.footer`
  padding: 80px 24px 120px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: ${tm(({ colors }) => colors.neutral900)};
  ${media.md} {
    padding: 64px 24px 40px;
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
  color: ${tm(({ colors }) => colors.neutral100)};
  font-size: 18px;
  font-weight: normal;
  line-height: 40px;
  letter-spacing: 0;
  text-align: center;
  margin-bottom: 16px;
  font-family: ChivoLight, sans-serif;
  ${media.md} {
    margin-bottom: unset;
    margin-right: 24px;
    font-size: 24px;
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
  color: ${tm(({ colors }) => colors.neutral700)};
  &:before {
    content: " ";
    height: 1px;
    width: 186px;
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    background-color: ${tm(({ colors }) => colors.neutral500)};
  }
  ${media.md} {
    font-size: 15px;
    line-height: 24px;
    margin-top: 96px;
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
        <Subtitle>Supported by</Subtitle>
        <EthereumFoundationLogo />
      </SupportedBy>
      <Legal>
        Copyright 2021 Nomic Labs LLC |
        <Link href={PRIVACY_POLICY_PATH} passHref>
          <PrivacyPolicyLink>Privacy Policy</PrivacyPolicyLink>
        </Link>
      </Legal>
    </Footer>
  );
};

export default LandingFooter;
