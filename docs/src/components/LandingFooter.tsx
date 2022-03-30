import { styled } from "linaria/react";
import React from "react";
import EthereumFoundationLogo from "../assets/ethereum-foundation-logo";
import { appTheme, tm } from "../themes";

const { media } = appTheme;

const Footer = styled.footer`
  padding: 80px 24px 120px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: ${tm(({ colors }) => colors.neutral900)};
  ${media.lg} {
    padding: 64px 24px 40px;
  }
`;

const SupportedBy = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  ${media.lg} {
    flex-direction: row;
  }
`;

const Subtitle = styled.h2`
  color: ${tm(({ colors }) => colors.neutral100)};
  font-size: 18px;
  font-style: normal;
  font-weight: 400;
  line-height: 40px;
  letter-spacing: 0em;
  text-align: center;
  margin-bottom: 16px;
  ${media.lg} {
    margin-bottom: unset;
    margin-right: 24px;
  }
`;

const Legal = styled.section`
  margin-top: 80px;
  padding-top: 21px;
  position: relative;
  font-size: 12px;
  line-height: 12px;
  letter-spacing: 0em;
  text-align: center;
  color: ${tm(({ colors }) => colors.neutral700)};
  &:before {
    content: " ";
    height: 1px;
    width: 186px;
    position: absolute;
    top: 0px;
    left: 50%;
    transform: translateX(-50%);
    background-color: ${tm(({ colors }) => colors.neutral500)};
  }
  ${media.lg} {
    font-size: 15px;
    line-height: 24px;
    margin-top: 96px;
  }
`;

const LandingFooter = () => {
  return (
    <Footer>
      <SupportedBy>
        <Subtitle>Supported by</Subtitle>
        <EthereumFoundationLogo />
      </SupportedBy>
      <Legal>Copyright 2021 Nomic Labs LLC</Legal>
    </Footer>
  );
};

export default LandingFooter;
