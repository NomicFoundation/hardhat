import React from "react";
import { styled } from "linaria/react";
import { useRouter } from "next/router";
import Link from "next/link";
import { MenuProps, MenuItemType, SocialsItem } from "./types";
import { media, tm, tmDark, tmHCDark, tmSelectors } from "../../themes";
import Searching from "../Searching";

const MenuContainer = styled.section<{ isDocumentation: boolean }>`
  user-select: none;
  width: 607px;
  display: none;
  background-color: ${tm(({ colors }) => colors.transparent)};
  ${media.md} {
    display: ${(props) => (props.isDocumentation ? "flex" : "none")};
    align-items: center;
    justify-content: space-evenly;
  }
  ${media.md} {
    display: flex;
    align-items: center;
    justify-content: space-evenly;
  }
`;

const MenuList = styled.ul`
  display: flex;
  list-style-type: none;
  align-items: center;
`;

const MenuItem = styled.li`
  margin-left: 32px;
  padding: 8px 0;
  &:first-child {
    margin-left: unset;
  }
`;

const MenuButton = styled.a`
  text-transform: uppercase;
  text-align: center;
  border: none;
  color: ${tm(({ colors }) => colors.neutral900)};
  background-color: ${tm(({ colors }) => colors.transparent)};
  font-size: 15px;
  line-height: 15px;
  letter-spacing: 0.07em;
  position: relative;
  cursor: pointer;
  &:after {
    transition: all ease-in-out 0.2s;
    position: absolute;
    bottom: -8px;
    left: 0;
    content: " ";
    width: 0;
    height: 1px;
    background-color: ${tm(({ colors }) => colors.neutral900)};
  }
  &:hover {
    &:after {
      width: 100%;
    }
  }
  &[data-current="true"] {
    &:after {
      width: 100%;
    }
  }
  :not(.landing &) {
    ${tmSelectors.hcDark} {
      color: ${tmHCDark(({ colors }) => colors.neutral900)};
      &:after {
        background-color: ${tmHCDark(({ colors }) => colors.neutral900)};
      }
    }
    ${tmSelectors.dark} {
      color: ${tmDark(({ colors }) => colors.neutral900)};
      &:after {
        background-color: ${tmDark(({ colors }) => colors.neutral900)};
      }
    }
    ${media.mqDark} {
      ${tmSelectors.auto} {
        color: ${tmDark(({ colors }) => colors.neutral900)};
      }
      &:after {
        background-color: ${tmDark(({ colors }) => colors.neutral900)};
      }
    }
  }
`;

const MenuSocialsList = styled.ul`
  width: 80px;
  display: flex;
  height: 32px;
  align-items: center;
  list-style-type: none;
  margin-left: 40px;
  justify-content: space-between;
`;

const SocialLink = styled.a`
  display: flex;
  align-items: center;
  :not(.landing &) {
    & svg {
      fill: ${tm(({ colors }) => colors.neutral900)};
      ${tmSelectors.hcDark} {
        fill: ${tmHCDark(({ colors }) => colors.neutral900)};
      }
      ${tmSelectors.dark} {
        fill: ${tmDark(({ colors }) => colors.neutral900)};
      }
      ${media.mqDark} {
        ${tmSelectors.auto} {
          fill: ${tmDark(({ colors }) => colors.neutral900)};
        }
      }
    }
  }
  &:hover svg {
    cursor: pointer;
    opacity: 0.8;
  }
  &:focus svg {
    cursor: pointer;
    opacity: 0.5;
  }
`;

const SocialLinksItem = styled.li`
  display: flex;
  align-items: center;
  justify-content: center;
  & svg {
    width: 22px;
    height: 22px;
  }
`;

const DesktopMenu = ({
  menuItems,
  socialsItems,
  isDocumentation = false,
}: MenuProps) => {
  const router = useRouter();

  return (
    <MenuContainer isDocumentation={isDocumentation}>
      <MenuList>
        {isDocumentation ? (
          <MenuItem>
            <Searching />
          </MenuItem>
        ) : null}
        {menuItems.map((menuItem: MenuItemType) => {
          return (
            <MenuItem key={menuItem.label}>
              <Link href={menuItem.href} passHref>
                <MenuButton data-current={router?.asPath === menuItem.href}>
                  {menuItem.label}
                </MenuButton>
              </Link>
            </MenuItem>
          );
        })}
      </MenuList>
      <MenuSocialsList>
        {socialsItems.map((social: SocialsItem) => {
          const { Icon } = social;
          return (
            <SocialLinksItem key={social.name}>
              <SocialLink
                target="_blank"
                rel="noreferrer"
                href={social.name}
                aria-label={social.name}
              >
                <Icon />
              </SocialLink>
            </SocialLinksItem>
          );
        })}
      </MenuSocialsList>
    </MenuContainer>
  );
};

export default DesktopMenu;
