import React, { FC, useContext } from "react";
import { styled } from "linaria/react";
import Link from "next/link";
import Image from "next/image";

import {
  media,
  ThemeContext,
  ThemesEnum,
  tm,
  tmDark,
  tmHCDark,
  tmSelectors,
} from "../themes";
import logo from "../assets/hardhat-logo.svg";
import darkLogo from "../assets/hardhat-logo-dark.svg";
import Hamburger from "./ui/Hamburger";
import DesktopMenu from "./ui/DesktopMenu";
import { menuItemsList, socialsItems } from "../config";
import ThemeSwitcher from "../assets/icons/theme-switcher.svg";
import ThemeSwitcherDark from "../assets/icons/theme-switcher-dark.svg";
import ThemeSwitcherHCDark from "../assets/icons/theme-switcher-hc-dark.svg";

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
  height: 96px;
  box-sizing: border-box;
  padding: 32px 24px;
  transition: all ease-in-out 0.25s;
  background-color: ${tm(({ colors }) => colors.neutral200)};
  border-bottom: 1px solid ${tm(({ colors }) => colors.transparent)};
  z-index: 10;
  ${media.md} {
    padding: 24px;
  }

  ${tmSelectors.hcDark} {
    background-color: ${tmHCDark(({ colors }) => colors.neutral200)};
    border-bottom: 1px solid ${tmHCDark(({ colors }) => colors.border)};
  }
  ${tmSelectors.dark} {
    background-color: ${tmDark(({ colors }) => colors.neutral200)};
    border-bottom: 1px solid ${tmDark(({ colors }) => colors.border)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-color: ${tmDark(({ colors }) => colors.neutral200)};
      border-bottom: 1px solid ${tmDark(({ colors }) => colors.border)};
    }
  }
`;

const ControlsContainer = styled.section`
  width: 100%;
  height: 96px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: ${tm(({ colors }) => colors.transparent)};
  box-sizing: border-box;
`;

const LogoContainer = styled.a`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4px 8px;
  box-sizing: border-box;
  background-color: ${tm(({ colors }) => colors.transparent)};
  border: none;
  cursor: pointer;
  & .dark-logo {
    display: none;
  }
  ${tmSelectors.hcDark} {
    & .dark-logo {
      display: inline;
    }
    & .light-logo {
      display: none;
    }
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
`;
const HamburgerWrapper = styled.div`
  ${media.md} {
    display: none;
  }
`;

const ThemeButton = styled.button`
  font-size: 15px;
  line-height: 13px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  background-color: ${tm(({ colors }) => colors.transparent)};
  color: ${tm(({ colors }) => colors.neutral900)};
  border: none;
  cursor: pointer;
  transform-origin: center;
  min-width: 45px;
  transition: transform ease-in-out 0.25s;
  &:hover {
    opacity: 0.8;
  }
  ${tmSelectors.hcDark} {
    color: ${tmHCDark(({ colors }) => colors.autoThemeButton)};
  }
  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.autoThemeButton)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.autoThemeButton)};
    }
  }
`;

const ThemeIconWrapper = styled.div`
  transition: transform ease-in-out 0.25s;
  & > span {
    display: none;
  }
  & > .theme-switcher {
    position: relative;
    bottom: -3px;
  }
  & > .light {
    display: inline;
  }
  ${tmSelectors.hcDark} {
    & > .light {
      display: none;
    }
    & > .hc-dark {
      display: inline;
    }
  }
  ${tmSelectors.dark} {
    & > .light {
      display: none;
    }
    & > .dark {
      display: inline;
    }
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      & > .light {
        display: none;
      }
      & > .dark {
        display: inline;
      }
    }
  }
`;

const DocsNavigation: FC<Props> = ({ isSidebarOpen, onSidebarOpen }) => {
  const { theme, changeTheme } = useContext(ThemeContext);

  return (
    <NavigationStyled data-theme={theme}>
      <ControlsContainer>
        <HamburgerLogoWrapper>
          <HamburgerWrapper>
            <Hamburger
              isOpen={isSidebarOpen}
              onClick={() => onSidebarOpen(!isSidebarOpen)}
            />
          </HamburgerWrapper>

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

        <DesktopMenu
          isDocumentation
          menuItems={menuItemsList}
          socialsItems={socialsItems}
        />
        <ThemeButton onClick={changeTheme} aria-label="change color theme">
          {theme === ThemesEnum.AUTO && "A"}
          <ThemeIconWrapper>
            <span className="light theme-switcher">
              <Image src={ThemeSwitcher} alt="theme-switcher" />
            </span>
            <span className="dark theme-switcher">
              <Image src={ThemeSwitcherDark} alt="theme-switcher" />
            </span>
            <span className="hc-dark theme-switcher">
              <Image
                src={ThemeSwitcherHCDark}
                alt="theme-switcher"
                width={32}
                height={32}
              />
            </span>
          </ThemeIconWrapper>
        </ThemeButton>
      </ControlsContainer>
    </NavigationStyled>
  );
};

export default DocsNavigation;
