import React, { useState } from "react";
import { styled } from "linaria/react";
import { useRouter } from "next/router";
import Link from "next/link";
import { MenuProps, MenuItemType, SocialsItem } from "./types";
import { media, tm, tmDark, tmSelectors } from "../../themes";

const MenuContainer = styled.section`
  font-family: ChivoRegular, sans-serif;
  user-select: none;
  display: none;
  background-color: ${tm(({ colors }) => colors.transparent)};

  ${media.laptop} {
    display: flex;
    align-items: center;
  }
`;

const MenuList = styled.ul`
  display: flex;
  list-style-type: none;
  align-items: center;
  margin-right: 65px;
  gap: 30px;
`;

const MenuItem = styled.li`
  padding: 8px 0;
  position: relative;
  &:hover > a:not([data-current="true"]) {
    color: #5e21ff !important;
  }
`;

const MenuButton = styled.a`
  text-align: center;
  border: none;
  color: ${tm(({ colors }) => colors.gray7)};
  background-color: ${tm(({ colors }) => colors.transparent)};
  font-size: 16px;
  font-weight: 500;
  padding: 0 8px;
  height: 27px;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  font-family: SourceCodePro, sans-serif;
  line-height: 15px;
  letter-spacing: 0.06em;
  position: relative;
  cursor: pointer;
  border-radius: 3px;
  text-transform: lowercase;

  &[data-current="true"] {
    background-color: ${tm(({ colors }) => colors.gray6)};
    color: ${tm(({ colors }) => colors.gray1)};
  }

  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.gray4)};
    &[data-current="true"] {
      background-color: ${tmDark(({ colors }) => colors.gray6)};
      color: ${tmDark(({ colors }) => colors.neutral200)};
    }
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.gray4)};
      &[data-current="true"] {
        background-color: ${tmDark(({ colors }) => colors.gray6)};
        color: ${tmDark(({ colors }) => colors.neutral200)};
      }
    }
  }
`;

const MenuSocialsList = styled.ul`
  min-width: 80px;
  gap: 24px;
  display: flex;
  height: 32px;
  align-items: center;
  list-style-type: none;
  justify-content: space-between;
  margin-right: 40px;
`;

const SocialLink = styled.a`
  display: flex;
  align-items: center;
  & svg {
    fill: ${tm(({ colors }) => colors.gray4)};
    ${tmSelectors.dark} {
      fill: #6c6f74;
    }
    ${media.mqDark} {
      ${tmSelectors.auto} {
        fill: #6c6f74;
      }
    }
  }
  &:hover svg,
  &:focus svg {
    cursor: pointer;
    fill: ${tm(({ colors }) => colors.gray6)};
    ${tmSelectors.dark} {
      fill: ${tmDark(({ colors }) => colors.gray7)};
    }
    ${media.mqDark} {
      ${tmSelectors.auto} {
        fill: ${tmDark(({ colors }) => colors.gray7)};
      }
    }
  }
`;

const SocialLinksItem = styled.li`
  display: flex;
  align-items: center;
  justify-content: center;
  & svg {
    width: 32px;
    height: 32px;
  }
  &[data-mobile="true"] svg {
    width: 24px;
    height: 24px;
  }
`;

const MenuItemDropDownWrapper = styled.div`
  position: absolute;
  top: calc(100% + 1px);
  left: 50%;
  transform: translateX(-50%);
  &:before {
    content: "";
    position: absolute;
    left: 0;
    bottom: 100%;
    width: 100%;
    height: 10px;
  }
`;

const MenuItemDropdown = styled.div`
  width: 180px;
  box-shadow: 0px 0px 6px 0px rgba(210, 211, 213, 0.5);
  background-color: ${tm(({ colors }) => colors.gray1)};
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 1;

  &::after {
    z-index: 1;
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

  ${tmSelectors.dark} {
    background-color: ${tmDark(({ colors }) => colors.neutral200)};
    box-shadow: 0px 0px 6px 0px rgba(74, 77, 84, 0.5);
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-color: ${tmDark(({ colors }) => colors.neutral200)};
      box-shadow: 0px 0px 6px 0px rgba(74, 77, 84, 0.5);
    }
  }
`;

const DropdownItem = styled.a`
  display: block;
  line-height: 1.5;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 500;
  font-family: SourceCodePro, sans-serif;
  color: ${tm(({ colors }) => colors.gray7)};
  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral800)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.neutral800)};
    }
  }
  &:hover,
  &:focus-visible {
    color: #5e21ff !important;
  }
`;

export const SocialsList = ({
  socialsItems,
  isMobile = false,
}: {
  socialsItems: SocialsItem[];
  isMobile?: boolean;
}) => {
  return (
    <MenuSocialsList>
      {socialsItems.map((social: SocialsItem) => {
        const { Icon } = social;
        return (
          <SocialLinksItem key={social.name} data-mobile={isMobile}>
            <SocialLink
              target="_blank"
              rel="noreferrer"
              href={social.href}
              aria-label={social.name}
            >
              <Icon />
            </SocialLink>
          </SocialLinksItem>
        );
      })}
    </MenuSocialsList>
  );
};

const DesktopMenu = ({ menuItems, socialsItems }: MenuProps) => {
  const router = useRouter();
  const [shownDropdown, setShownDropdown] = useState<string | null>(null);

  return (
    <MenuContainer>
      <MenuList>
        {/* <MenuItem>
          <Searching />
        </MenuItem> */}

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
                            {subItem.prefix} {subItem.label}
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
      <SocialsList socialsItems={socialsItems} />
    </MenuContainer>
  );
};

export default DesktopMenu;
