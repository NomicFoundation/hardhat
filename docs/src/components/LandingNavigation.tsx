import React, { FC, useEffect, useState } from "react";
import { styled } from "linaria/react";
import Link from "next/link";
import { appTheme, tm } from "../themes";
import HardhatLogo from "../assets/hardhat-logo";
import Hamburger from "./ui/Hamburger";
import MobileMenu from "./ui/MobileMenu";
import Menu from "./ui/DesktopMenu";

const { media } = appTheme;

const Navigation = styled.nav`
  position: sticky;
  margin-top: 40px;
  top: 0;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 96px;
  box-sizing: border-box;
  padding: 32px 24px;
  transition: all ease-in-out 0.5s;
  background-color: ${tm(({ colors }) => colors.neutral0)};
  z-index: 10;
  ${media.lg} {
    padding: 24px 0;
  }
`;

const ControlsContainer = styled.section`
  width: 100%;
  height: 96px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: ${tm(({ colors }) => colors.neutral0)};
  box-sizing: border-box;
  max-width: 960px;
  cursor: pointer;
`;

const LogoContainer = styled.a`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4px 8px;
  box-sizing: border-box;
  background-color: ${tm(({ colors }) => colors.neutral0)};
  border: none;
  cursor: pointer;
`;

const LandingNavigation: FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const body = document.querySelector("body");
    if (!body) return;

    if (isMobileMenuOpen) {
      // Disable scroll
      body.style.overflow = "hidden";
    } else {
      // Enable scroll
      body.style.overflow = "auto";
    }
  }, [isMobileMenuOpen]);

  return (
    <Navigation>
      <ControlsContainer>
        <Link href="/" passHref>
          <LogoContainer>
            <HardhatLogo />
          </LogoContainer>
        </Link>
        <Hamburger
          isOpen={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />
        <Menu />
      </ControlsContainer>

      <MobileMenu isOpen={isMobileMenuOpen} />
    </Navigation>
  );
};

export default LandingNavigation;
