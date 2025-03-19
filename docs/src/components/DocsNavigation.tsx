import React, { FC, useContext } from "react";
import { styled } from "linaria/react";
import Link from "next/link";
import Image from "next/image";

import { media, ThemeContext, tm, tmDark, tmSelectors } from "../themes";
import logo from "../assets/hardhat-logo.svg";
import darkLogo from "../assets/hardhat-logo-dark.svg";
import Hamburger from "./ui/Hamburger";
import DesktopMenu from "./ui/DesktopMenu";
import { menuItemsList, socialsItems } from "../config";
import ThemeSwitchButton from "./ThemeSwitchButton";

interface Props {
  isSidebarOpen: boolean;
  onSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const NavigationStyled = styled.nav`
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  padding: 0 16px;
  transition: all ease-in-out 0.25s;
  background-color: ${tm(({ colors }) => colors.neutral0)};
  z-index: 10;

  ${tmSelectors.dark} {
    background-color: ${tmDark(({ colors }) => colors.neutral0)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-color: ${tmDark(({ colors }) => colors.neutral0)};
    }
  }
  ${media.tablet} {
    padding: 0 44px;
  }
  ${media.laptop} {
    padding: 0 32px;
  }
`;

const ControlsContainer = styled.section`
  width: 100%;
  height: 80px;
  display: flex;
  align-items: center;
  background-color: ${tm(({ colors }) => colors.transparent)};
  box-sizing: border-box;
  ${media.laptop} {
    padding-top: 10px;
    height: 90px;
  }
`;

const LogoContainer = styled.a`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4px 0;
  box-sizing: border-box;
  background-color: ${tm(({ colors }) => colors.transparent)};
  border: none;
  cursor: pointer;

  & .dark-logo {
    display: none;
  }
  ${tmSelectors.dark} {
    & .dark-logo {
      display: inline;
    }
    & .light-logo {
      display: none;
    }
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      & .dark-logo {
        display: inline;
      }
      & .light-logo {
        display: none;
      }
    }
  }
`;

const HamburgerLogoWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-right: auto;
`;
const HamburgerWrapper = styled.div`
  ${media.laptop} {
    display: none;
  }
`;

const DocsNavigation: FC<Props> = ({ isSidebarOpen, onSidebarOpen }) => {
  const { theme } = useContext(ThemeContext);

  return (
    <NavigationStyled data-theme={theme}>
      <ControlsContainer>
        <HamburgerLogoWrapper>
          <Link href="/" passHref>
            <LogoContainer aria-label="home page">
              <span className="light-logo">
                <Image src={logo} alt="logo" />
              </span>
              <span className="dark-logo">
                <Image src={darkLogo} alt="logo" />
              </span>
            </LogoContainer>
          </Link>
        </HamburgerLogoWrapper>

        <DesktopMenu menuItems={menuItemsList} socialsItems={socialsItems} />
        <ThemeSwitchButton />
        <HamburgerWrapper>
          <Hamburger
            isOpen={isSidebarOpen}
            onClick={() => onSidebarOpen(!isSidebarOpen)}
          />
        </HamburgerWrapper>
      </ControlsContainer>
    </NavigationStyled>
  );
};

export default DocsNavigation;
