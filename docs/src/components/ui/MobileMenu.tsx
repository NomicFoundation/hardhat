import React, { Fragment } from "react";
import { styled } from "linaria/react";
import { useRouter } from "next/router";
import Link from "next/link";
import { tm } from "../../themes";

import { MenuItemType, MenuProps, SocialsItem } from "./types";
import { defaultSocialsItems } from "./default-props";
import { defaultMenuItemsList } from "../../config";

const MobileMenuContainer = styled.section`
  position: fixed;
  top: 40px;
  right: -110vw;
  user-select: none;
  width: 100%;
  z-index: -1;
  height: max(100vh, 655px);
  display: flex;
  padding: 240px 112px 100px;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;
  transition: all ease-in-out 0.5s;
  background-color: ${tm(({ colors }) => colors.neutral0)};
  opacity: 0.8;
  overflow-y: scroll;
  &::-webkit-scrollbar {
    display: none;
  }
  &[data-open="true"] {
    right: 0px;
    opacity: 1;
  }
`;

const MobileMenuList = styled.ul`
  width: 100%;
  display: flex;
  list-style-type: none;
  flex-direction: column;
  align-items: center;
`;

const MobileMenuSocialsList = styled.ul`
  width: 100%;
  display: flex;
  align-items: center;
  list-style-type: none;
  margin-top: 44px;
  justify-content: space-evenly;
`;

const MobileMenuItem = styled.li`
  margin-top: 48px;
  &:first-child {
    margin-top: unset;
  }
`;

const MobileMenuButton = styled.a`
  text-transform: uppercase;
  text-align: center;
  border: none;
  background-color: ${tm(({ colors }) => colors.neutral0)};
  color: ${tm(({ colors }) => colors.neutral900)};
  font-size: 28px;
  line-height: 24px;
  letter-spacing: 0.07em;
  text-align: center;
  &:hover {
    cursor: pointer;
    color: ${tm(({ colors }) => colors.neutral600)};
  }
`;

const MobileMenuSubContainer = styled.ul<{ itemsCount: number }>`
  margin-top: 24px;
  user-select: none;
  list-style-type: none;
  min-width: 130px;
  height: ${(props) => `${props.itemsCount * 40 - 16}px`};
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const MobileMenuSubItem = styled.li`
  margin-top: 16px;
  &:first-child {
    margin-top: unset;
  }
`;

const MobileMenuSubItemButton = styled.a`
  text-align: center;
  border: none;
  color: ${tm(({ colors }) => colors.neutral900)};
  font-size: 15px;
  background-color: transparent;
  line-height: 24px;
  letter-spacing: 0.04em;
  text-align: center;
  & .prefix {
    margin-right: 4px;
    color: ${tm(({ colors }) => colors.neutral600)};
  }
  &:last-child {
    margin-bottom: unset;
  }
  &:hover {
    cursor: pointer;
    opacity: 0.8;
  }
`;

const SocialLink = styled.a`
  & svg {
    fill: ${tm(({ colors }) => colors.neutral900)};
  }
  &:hover svg {
    cursor: pointer;
    fill: ${tm(({ colors }) => colors.neutral600)};
  }
  &:focus svg {
    cursor: pointer;
    opacity: 0.5;
  }
`;

const SocialLinksItem = styled.li`
  width: 40px;
  height: 40px;
`;

const MobileMenu = (props: MenuProps) => {
  const { menuItems, isOpen, socialsItems } = props;
  return (
    <MobileMenuContainer data-open={isOpen}>
      <MobileMenuList>
        {menuItems.map((menuItem: MenuItemType) => {
          return (
            <Fragment key={menuItem.label}>
              <MobileMenuItem>
                <Link href={menuItem.href} passHref>
                  <MobileMenuButton>{menuItem.label}</MobileMenuButton>
                </Link>
              </MobileMenuItem>
              {menuItem.subItems && menuItem.subItems.length > 0 && (
                <MobileMenuSubContainer itemsCount={menuItem.subItems.length}>
                  {menuItem.subItems.map((subItem: MenuItemType) => {
                    return (
                      <MobileMenuSubItem key={subItem.label}>
                        <Link href={subItem.href} passHref>
                          <MobileMenuSubItemButton>
                            {subItem.prefix && (
                              <span className="prefix">{subItem.prefix}</span>
                            )}
                            <span>{subItem.label}</span>
                          </MobileMenuSubItemButton>
                        </Link>
                      </MobileMenuSubItem>
                    );
                  })}
                </MobileMenuSubContainer>
              )}
            </Fragment>
          );
        })}
      </MobileMenuList>
      <MobileMenuSocialsList>
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
      </MobileMenuSocialsList>
    </MobileMenuContainer>
  );
};

export default React.memo(MobileMenu);

MobileMenu.defaultProps = {
  menuItems: defaultMenuItemsList,
  socialsItems: defaultSocialsItems,
};
