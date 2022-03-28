import React from "react";
import { styled } from "linaria/react";
import { useRouter } from "next/router";
import Link from "next/link";
import { tm } from "../../themes";
import { MenuProps, MenuItemType, SocialsItem } from "./types";
import { defaultSocialsItems } from "./default-props";
import { defaultMenuItemsList } from "../../config";

const MenuContainer = styled.section`
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: space-evenly;
  width: 607px;
  background-color: ${tm(({ colors }) => colors.neutral0)};
`;

const MenuList = styled.ul`
  width: 486px;
  display: flex;
  list-style-type: none;
  align-items: center;
`;

const MenuItem = styled.li`
  margin-left: 32px;
  padding: 8px 0px;
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
  text-align: center;
  position: relative;
  &:after {
    transition: all ease-in-out 0.2s;
    position: absolute;
    bottom: -8px;
    left: 0;
    content: " ";
    width: 0px;
    height: 1px;
    background-color: ${tm(({ colors }) => colors.neutral900)};
  }
  &:hover {
    cursor: pointer;
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

const Menu = (props: MenuProps) => {
  const { menuItems, socialsItems } = props;
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

export default React.memo(Menu);

Menu.defaultProps = {
  menuItems: defaultMenuItemsList,
  socialsItems: defaultSocialsItems,
};
