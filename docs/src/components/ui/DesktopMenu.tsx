import React from "react";
import { styled } from "linaria/react";
import { useRouter } from "next/router";
import Link from "next/link";
import { MenuProps, MenuItemType, SocialsItem } from "./types";
import defaultProps from "./default-props";
import { defaultMenuItemsList } from "../../config";
import { appTheme, tm } from "../../themes";

const { defaultSocialsItems } = defaultProps;
const { media } = appTheme;

const MenuContainer = styled.section`
  user-select: none;
  width: 607px;
  display: none;
  background-color: ${tm(({ colors }) => colors.neutral0)};
  ${media.lg} {
    display: flex;
    align-items: center;
    justify-content: space-evenly;
  }
`;

const MenuList = styled.ul`
  width: 486px;
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
  background-color: ${tm(({ colors }) => colors.neutral0)};
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
  & svg {
    fill: ${tm(({ colors }) => colors.neutral900)};
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

const Menu = ({ menuItems, socialsItems }: MenuProps) => {
  const router = useRouter();

  return (
    <MenuContainer>
      <MenuList>
        {menuItems.map((menuItem: MenuItemType) => {
          return (
            <MenuItem key={menuItem.label}>
              <Link href={menuItem.href} passHref>
                <MenuButton data-current={router?.pathname === menuItem.href}>
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
              <SocialLink target="_blank" rel="noreferrer" href={social.href}>
                <Icon />
              </SocialLink>
            </SocialLinksItem>
          );
        })}
      </MenuSocialsList>
    </MenuContainer>
  );
};

export default Menu;

Menu.defaultProps = {
  menuItems: defaultMenuItemsList,
  socialsItems: defaultSocialsItems,
};
