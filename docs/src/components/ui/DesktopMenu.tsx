import React, { useState } from "react";
import { styled } from "linaria/react";
import { useRouter } from "next/router";
import Link from "next/link";
import { MenuProps, MenuItemType, SocialsItem } from "./types";
import { media, tm, tmDark, tmHCDark, tmSelectors } from "../../themes";
import Searching from "../Searching";

const MenuContainer = styled.section<{ isDocumentation: boolean }>`
  font-family: ChivoRegular, sans-serif;
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
  position: relative;
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
        &:after {
          background-color: ${tmDark(({ colors }) => colors.neutral900)};
        }
      }
    }
  }
`;

const MenuSocialsList = styled.ul`
  min-width: 80px;
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

const MenuItemDropDownWrapper = styled.div`
  width: 494px;
  height: 200px;
  position: absolute;
  top: 25px;
  left: 50%;
  transform: translateX(-50%);
`;

const MenuItemDropdown = styled.div`
  width: 494px;
  height: 176px;
  box-shadow: 0px 9px 28px 8px rgba(0, 0, 0, 0.05);
  filter: drop-shadow(0px 6px 50px rgba(10, 11, 13, 0.41));
  border-radius: 4px;
  background-color: ${tm(({ colors }) => colors.neutral0)};
  padding: 24px 32px;
  position: relative;
  top: 25px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-wrap: wrap;
  z-index: 1;
  & svg {
    border-radius: 4px;
    width: 42px;
    height: 42px;
  }
  &::after {
    z-index: -1;
    position: absolute;
    top: -6px;
    left: 50%;
    transform: translateX(-50%) rotate(45deg);
    transform-origin: center;
    content: " ";
    width: 16px;
    height: 16px;
    background-color: inherit;
  }
  :not(.landing &) {
    ${tmSelectors.hcDark} {
      background-color: ${tmHCDark(({ colors }) => colors.neutral0)};
    }
    ${tmSelectors.dark} {
      background-color: ${tmDark(({ colors }) => colors.neutral0)};
    }
    ${media.mqDark} {
      ${tmSelectors.auto} {
        background-color: ${tmDark(({ colors }) => colors.neutral0)};
      }
    }
  }
`;

const DropdownItem = styled.a`
  width: 214px;
  height: 58px;
  padding: 10.5px 20.5px;
  display: flex;
  align-items: center;
  .icon.dark {
    display: none;
  }
  :not(.landing &) {
    ${tmSelectors.hcDark} {
      .light {
        display: none;
      }
      .dark {
        display: inline;
      }
    }
    ${tmSelectors.dark} {
      .light {
        display: none;
      }
      .dark {
        display: inline;
      }
    }
    ${media.mqDark} {
      ${tmSelectors.auto} {
        .light {
          display: none;
        }
        .dark {
          display: inline;
        }
      }
    }
  }
`;

const ButtonNameContainer = styled.div`
  display: flex;
  align-items: center;
  margin-left: 12px;
  position: relative;
  color: ${tm(({ colors }) => colors.neutral900)};
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
  ${DropdownItem}:hover > &:after {
    width: 100%;
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
        &:after {
          background-color: ${tmDark(({ colors }) => colors.neutral900)};
        }
      }
    }
  }
`;

const ButtonCompanyName = styled.span`
  font-size: 15px;
  font-family: ChivoLight, sans-serif;
  color: ${tm(({ colors }) => colors.neutral600)};
  font-weight: 800;
`;

const ButtonToolName = styled.span`
  margin-left: 4px;
  font-size: 15px;
  font-family: ChivoLight, sans-serif;
  color: inherit;
  line-height: 24px;
  font-weight: 800;
  white-space: nowrap;
`;

const DesktopMenu = ({
  menuItems,
  socialsItems,
  isDocumentation = false,
}: MenuProps) => {
  const router = useRouter();
  const [shownDropdown, setShownDropdown] = useState<string | null>(null);

  return (
    <MenuContainer isDocumentation={isDocumentation}>
      <MenuList>
        {isDocumentation ? (
          <MenuItem>
            <Searching />
          </MenuItem>
        ) : null}
        {menuItems.map((menuItem: MenuItemType) => {
          const isSelected =
            menuItem.href === "/"
              ? router?.asPath === menuItem.href
              : router?.asPath.includes(menuItem.href);
          return (
            <MenuItem
              onMouseEnter={() => {
                if (!menuItem.subItems) return;
                setShownDropdown(menuItem.label);
              }}
              onMouseLeave={() => {
                if (!menuItem.subItems) return;
                setShownDropdown(null);
              }}
              key={menuItem.label}
            >
              <Link href={menuItem.href} passHref>
                <MenuButton data-current={isSelected}>
                  {menuItem.label}
                </MenuButton>
              </Link>
              {menuItem.subItems && shownDropdown === menuItem.label && (
                <MenuItemDropDownWrapper>
                  <MenuItemDropdown>
                    {menuItem.subItems.map((subItem) => {
                      return (
                        <Link
                          key={`${subItem.href}-${menuItem.label}`}
                          href={subItem.href}
                          passHref
                          scroll={false}
                        >
                          <DropdownItem>
                            {subItem.icon && (
                              <subItem.icon className="icon light" />
                            )}
                            {subItem.iconDark && (
                              <subItem.iconDark className="icon dark" />
                            )}
                            <ButtonNameContainer>
                              <ButtonCompanyName>
                                {subItem.prefix}
                              </ButtonCompanyName>
                              <ButtonToolName>{subItem.label}</ButtonToolName>
                            </ButtonNameContainer>
                          </DropdownItem>
                        </Link>
                      );
                    })}
                  </MenuItemDropdown>
                </MenuItemDropDownWrapper>
              )}
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
