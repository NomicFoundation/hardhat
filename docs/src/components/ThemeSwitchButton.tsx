import React, { useContext } from "react";
import { styled } from "linaria/react";
import Image from "next/image";
import {
  media,
  ThemeContext,
  ThemesEnum,
  tm,
  tmDark,
  tmSelectors,
} from "../themes";
import ThemeSwitcher from "../assets/icons/theme-switcher.svg";
import ThemeSwitcherDark from "../assets/icons/theme-switcher-dark.svg";

const ThemeButton = styled.button`
  font-size: 15px;
  line-height: 13px;
  display: none;
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
  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.autoThemeButton)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.autoThemeButton)};
    }
  }
  ${media.md} {
    display: flex;
  }
  &[data-mobile="true"] {
    display: flex;
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

const ThemeSwitchButton = ({ isMobile = false }: { isMobile?: boolean }) => {
  const { theme, changeTheme } = useContext(ThemeContext);

  return (
    <ThemeButton
      onClick={changeTheme}
      aria-label="change color theme"
      data-mobile={isMobile}
    >
      {theme === ThemesEnum.AUTO && "A"}
      <ThemeIconWrapper>
        <span className="light theme-switcher">
          <Image src={ThemeSwitcher} alt="theme-switcher" />
        </span>
        <span className="dark theme-switcher">
          <Image src={ThemeSwitcherDark} alt="theme-switcher" />
        </span>
      </ThemeIconWrapper>
    </ThemeButton>
  );
};

export default ThemeSwitchButton;
