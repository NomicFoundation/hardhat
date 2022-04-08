import React, { FC } from "react";
import { styled } from "linaria/react";
import Link from "next/link";
import { appTheme, tm } from "../themes";
import HardhatLogo from "../assets/hardhat-logo";
import Hamburger from "./ui/Hamburger";
import Menu from "./ui/DesktopMenu";
import { menuItemsList, socialsItems } from "../config";

const { media } = appTheme;

interface Props {
  isSidebarOpen: boolean;
  onSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const NavigationStyled = styled.nav`
  position: relative;
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
  background-color: ${tm(({ colors }) => colors.neutral200)};
  z-index: 10;
  ${media.lg} {
    padding: 24px;
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
  cursor: pointer;
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

const Navigation: FC<Props> = ({ isSidebarOpen, onSidebarOpen }) => {
  return (
    <NavigationStyled>
      <ControlsContainer>
        <HamburgerLogoWrapper>
          <HamburgerWrapper>
            <Hamburger
              isOpen={isSidebarOpen}
              onClick={() => onSidebarOpen(!isSidebarOpen)}
            />
          </HamburgerWrapper>

          <Link href="/" passHref>
            <LogoContainer>
              <HardhatLogo />
            </LogoContainer>
          </Link>
        </HamburgerLogoWrapper>

        <Menu
          isDocumentation
          menuItems={menuItemsList}
          socialsItems={socialsItems}
        />
        <div>Theme</div>
      </ControlsContainer>
    </NavigationStyled>
  );
};

export default Navigation;
