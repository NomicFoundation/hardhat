import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createTheming } from "@callstack/react-theme-provider";

export { styled } from "linaria/react";

export enum ThemesEnum {
  LIGHT = "LIGHT",
  DARK = "DARK",
  AUTO = "AUTO",
}
export const breakpoints = {
  xxs: 320,
  xs: 360,
  sm: 412,
  smd: 592,
  tablet: 768,
  md: 1000,
  lg: 1200,
  laptop: 1280,
  desktop: 1700,
};

export const media = {
  xxs: `@media screen and (min-width: ${breakpoints.xxs}px)`,
  xs: `@media screen and (min-width: ${breakpoints.xs}px)`,
  sm: `@media screen and (min-width: ${breakpoints.sm}px)`,
  smd: `@media screen and (min-width: ${breakpoints.smd}px)`,
  tablet: `@media screen and (min-width: ${breakpoints.tablet}px)`,
  md: `@media screen and (min-width: ${breakpoints.md}px)`,
  lg: `@media screen and (min-width: ${breakpoints.lg}px)`,
  laptop: `@media screen and (min-width: ${breakpoints.laptop}px)`,
  desktop: `@media screen and (min-width: ${breakpoints.desktop}px)`,
  mqDark: "@media (prefers-color-scheme: dark)",
};

export const tmSelectors = {
  dark: "body.DARK &",
  auto: "body.AUTO &",
};

export const lightPalette = {
  name: "Light",
  transparent: "transparent",
  gray1: "#FBFBFB",
  gray2: "#E5E6E7",
  gray3: "#D2D3D5",
  gray4: "#B0B2B5",
  gray5: "#8E9094",
  gray6: "#6C6F74",
  gray7: "#4A4D54",
  gray8b: "#181A1F",
  gray9: "#16181D",

  base400: "#4A4D54",
  base100: "#181A1F",
  neutral0: "#FFFFFF",
  neutral100: "#F2F2F2",
  neutral200: "#FCFCF1",
  neutral400: "#C4C4C4",
  neutral500: "#4B4D4D",
  neutral600: "#6E6F70",
  neutral700: "#9B9FA8",
  neutral800: "#16181D",
  neutral900: "#0A0A0A",
  accent100: "#FBFCDB",
  accent200: "#F8F6E2",
  accent300: "#FFF787",
  accent600: "#FFF04D",
  accent700: "#CCB200",
  accent800: "#FFF100",
  accent900: "#EDCF00",
  border: "#4B4D4D",
  secondaryCTAHover: "#4F00A30D",
  tableBorder: "#DFE2E5",
  tipBorderColor: "#42B983",
  tipBackgroundColor: "#F3F5F7",
  warningColorTitle: "#F08D49",
  warningColorText: "#0A0A0A",
  warningBorderColor: "#F08D49",
  warningBackgroundColor: "#FEF6F1",
  codeBackground: "rgba(27,31,35,.05)",
  codeColor: "#4A4D54",
  codeLineHighlight: "#000000a8",
  preCodeColor: "#FFFFFF",
  codeBlockBackground: "#282c34",
  codeBlockBorder: "#282c34",
  complementary600: "#E9DEFA",
  cardBoxShadow: "#0A0A0A14",
  vibrantBoxShadow: "#0A0A0A14",
  vibrantBackground: "#FFFFFF",
  sliderButtonShadow: "rgba(0, 0, 0, 0.102)",
  sliderButtonHoverShadow: "#d4d4d480",
  toolsBlockBorder: "#d4d4d4",
  mottoRunnerBackground: "#F8F4CB",
  mottoNetworkBackground: "#f6edd1",
  mottoIgnitionBackground: "#f3ecf3",
  mottoVscodeBackground: "#f0e7fb",
  getStartedTopBackground:
    "linear-gradient(180deg, #ffffff 3.12%, rgba(255, 255, 255, 0) 67.71%)",
  getStartedBottomBackground:
    "linear-gradient(180deg, #ffffff 0%, rgba(255, 255, 255, 0) 55.73%)",
  textureBackground:
    "linear-gradient(254.24deg, #E9DEFA 0%, #FBFCDB 100%, #FBFCDB 100%);",
  neutralBackground:
    "linear-gradient(180deg, #FFFFFF 7.96%, rgba(255, 255, 255, 0.484844) 18.71%, rgba(255, 255, 255, 0) 28.83%, rgba(255, 255, 255, 0) 68.82%, #FFFFFF 91.43%);",
  link: "#CCB200",
  autoThemeButton: "#6C6F74",
  searchShadow: "#16181D90",
  editPageColor: "#484E5E",
  tagBackground: "#E5E6E7",
  tabBackground: "#FBFBFB",
  tabBackgroundHover: "#48484d",
  tabBackgroundSelected: "#282C34",
  cookiePopUpBackground: "#FBFAEF",
  cookieTextColor: "#4B4B59",
  cookieShadow: "#0A0A0A14",
  cookieDropShadow: "#0A0B0D69",
  backButton: "#6E6F70",
  toolsBoxShadow1: "#EEE3FF",
  toolsBoxShadow2: "#FBFCDB",
  toolsBoxShadowDark: "#04040566",
  footerText: "#F2F2F2",
  footerText2: "#9B9FA8",
};

export const darkPalette = {
  name: "Dark",
  transparent: "transparent",
  gray1: "#16181D",
  gray2: "#E5E6E7",
  gray3: "#333538",
  gray4: "#B0B2B5",
  gray5: "#B0B2B5",
  gray6: "#B0B2B5",
  gray7: "#B0B2B5",
  gray8b: "#E5E6E7",
  gray9: "#B0B2B5",
  base400: "#B0B2B5",
  base100: "#E5E6E7",
  neutral0: "#181A1F",
  neutral100: "#F2F2F2",
  neutral200: "#16181D",
  neutral400: "#4B4D4D",
  neutral500: "#4B4D4D",
  neutral600: "#6E6F70",
  neutral700: "#9B9FA8",
  neutral800: "#B0B2B5",
  neutral900: "#FFFFFF",
  accent100: "#24241f",
  accent200: "#20232A",
  accent300: "#FFF787",
  accent600: "#FFF04D",
  accent700: "#CCB200",
  accent800: "#FFF100",
  accent900: "#EDCF00",
  border: "#4B4D4D",
  secondaryCTAHover: "#b497d3fb",
  tableBorder: "#DFE2E5",
  tipBorderColor: "#246648",
  tipBackgroundColor: "#282C34",
  warningColorTitle: "#9F5D30",
  warningColorText: "#D2D3D5",
  warningBorderColor: "#9F5D30",
  warningBackgroundColor: "#282C34",
  codeBackground: "#20232a",
  codeColor: "#FFFFFF",
  codeLineHighlight: "#000000a8",
  preCodeColor: "#FFFFFF",
  codeBlockBackground: "#20232a",
  codeBlockBorder: "#6c6f74",
  complementary600: "#232125",
  cardBoxShadow: "#FFFFFF14",
  vibrantBoxShadow: "#0A0A0A1A",
  vibrantBackground: "#20232A",
  sliderButtonShadow: "rgba(0, 0, 0, 0.102)",
  sliderButtonHoverShadow: "#d4d4d480",
  toolsBlockBorder: "#4A4D54",
  mottoRunnerBackground: "#F8F4CB",
  mottoNetworkBackground: "#f6edd1",
  mottoIgnitionBackground: "#f3ecf3",
  mottoVscodeBackground: "#f0e7fb",
  getStartedTopBackground:
    "linear-gradient(180deg, #0A0A0A 3.12%, rgba(255, 255, 255, 0) 67.71%)",
  getStartedBottomBackground:
    "linear-gradient(180deg, #0A0A0A 0%, rgba(255, 255, 255, 0) 55.73%)",
  textureBackground:
    "linear-gradient(254.24deg, #E9DEFA 0%, #FBFCDB 100%, #FBFCDB 100%);",
  neutralBackground:
    "linear-gradient(180deg, #FFFFFF 7.96%, rgba(255, 255, 255, 0.484844) 18.71%, rgba(255, 255, 255, 0) 28.83%, rgba(255, 255, 255, 0) 68.82%, #FFFFFF 91.43%);",
  link: "#CCB200",
  autoThemeButton: "#FBFBFB",
  searchShadow: "#B0B2B590",
  editPageColor: "#B0B2B5",
  tagBackground: "#20232A",
  tabBackground: "#282C34",
  tabBackgroundHover: "#181A1F",
  tabBackgroundSelected: "#E5E6E7",
  cookiePopUpBackground: "#20232A",
  cookieTextColor: "#D2D3D5",
  cookieShadow: "#0A0A0A14",
  cookieDropShadow: "#0A0B0D69",
  backButton: "#F2F2F2",
  toolsBoxShadow1: "#EEE3FF",
  toolsBoxShadow2: "#FBFCDB",
  toolsBoxShadowDark: "#04040566",
  footerText: "#181A1F",
  footerText2: "#B0B2B5",
} as Palette;

type Palette = typeof lightPalette;

export const appTheme = {
  light: {
    colors: lightPalette,
  },
  dark: {
    colors: darkPalette,
  },
  media,
  breakpoints,
  tmSelectors,
};

const themesArray = Object.values(ThemesEnum);

export const getNextTheme = (currentTheme: ThemesEnum): ThemesEnum => {
  const currentThemeIndex = themesArray.indexOf(currentTheme);
  const nextThemeIndex =
    currentThemeIndex === themesArray.length - 1 ? 0 : currentThemeIndex + 1;
  const nextTheme = themesArray[nextThemeIndex];
  return nextTheme;
};

export const theming = createTheming(appTheme);

interface IThemeContext {
  theme: ThemesEnum;
  changeTheme: () => void;
}

export const ThemeContext = React.createContext<IThemeContext>({
  theme: ThemesEnum.AUTO,
  changeTheme: () => {},
});

export const ThemeProvider = ({
  children,
}: React.PropsWithChildren<{}>): JSX.Element => {
  const [theme, setTheme] = useState<ThemesEnum>(ThemesEnum.AUTO);

  const changeTheme = useCallback(() => {
    const body = document.querySelector("body") as Element;
    const newTheme = ThemesEnum[getNextTheme(theme)];
    body.className = newTheme;
    localStorage.setItem("theme", newTheme);
    setTheme(newTheme);
  }, [theme, setTheme]);

  const initialContext = useMemo(
    () => ({ theme, changeTheme }),
    [theme, changeTheme]
  );

  useEffect(() => {
    const savedTheme =
      (localStorage.getItem("theme") as ThemesEnum) || ThemesEnum.AUTO;
    setTheme(savedTheme);
  }, []);

  return (
    <ThemeContext.Provider value={initialContext}>
      {/* @ts-ignore */}
      <theming.ThemeProvider theme={appTheme}>{children}</theming.ThemeProvider>
    </ThemeContext.Provider>
  );
};

type ThemeSelect<T> = (tm: T) => string;

export const tm = (cb: ThemeSelect<{ colors: Palette }>) => () =>
  ((fn) => fn(theming.useTheme().light))(cb);

export const tmDark = (cb: ThemeSelect<{ colors: Palette }>) => () =>
  ((fn) => fn(theming.useTheme().dark))(cb);
