import React, { FC } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { styled } from "linaria/react";
import { media, tm, tmDark, tmHCDark, tmSelectors } from "../themes";
import Sidebar from "./Sidebar";
import { menuItemsList, socialsItems as defaultSocialItems } from "../config";
import ExternalLinkIcon from "../assets/icons/external-link-icon";
import { IDocumentationSidebarStructure } from "./types";

interface Props {
  sidebarElementsList: IDocumentationSidebarStructure;
  menuItems: typeof menuItemsList;
  socialsItems: typeof defaultSocialItems;
}

const MobileSidebarContainer = styled.section`
  display: flex;
  flex-direction: column;
  background-color: ${tm(({ colors }) => colors.neutral0)};
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
`;

const MobileNavigationContainer = styled.ul`
  list-style-type: none;
  display: flex;
  flex-direction: column;
  padding: 16px 0;
  color: ${tm(({ colors }) => colors.neutral800)};
  border-bottom: 1px solid ${tm(({ colors }) => colors.neutral400)};
  ${tmSelectors.hcDark} {
    border-bottom: ${tmHCDark(({ colors }) => colors.neutral400)};
    color: ${tmHCDark(({ colors }) => colors.neutral800)};
  }
  ${tmSelectors.dark} {
    border-bottom: ${tmDark(({ colors }) => colors.neutral400)};
    color: ${tmDark(({ colors }) => colors.neutral800)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      border-bottom: ${tmDark(({ colors }) => colors.neutral400)};
      color: ${tmDark(({ colors }) => colors.neutral800)};
    }
  }
`;

const MenuItem = styled.li`
  padding: 8px 24px;
  display: flex;
  align-items: center;
  font-size: 18px;
  text-transform: capitalize;
  & > a {
    position: relative;
    &:after {
      transition: all ease-in-out 0.2s;
      position: absolute;
      bottom: -8px;
      left: 0;
      content: " ";
      width: 0;
      height: 2px;
      background-color: ${tm(({ colors }) => colors.accent700)};
      ${tmSelectors.hcDark} {
        background-color: ${tmHCDark(({ colors }) => colors.accent700)};
      }
      ${tmSelectors.dark} {
        background-color: ${tmDark(({ colors }) => colors.accent700)};
      }
      ${media.mqDark} {
        ${tmSelectors.auto} {
          background-color: ${tmDark(({ colors }) => colors.accent700)};
        }
      }
    }
  }
  &[data-current="true"] {
    & > a {
      color: ${tm(({ colors }) => colors.accent700)};
      ${tmSelectors.hcDark} {
        color: ${tmHCDark(({ colors }) => colors.accent700)};
      }
      ${tmSelectors.dark} {
        color: ${tmDark(({ colors }) => colors.accent700)};
      }
      ${media.mqDark} {
        ${tmSelectors.auto} {
          color: ${tmDark(({ colors }) => colors.accent700)};
        }
      }
      &:after {
        width: 100%;
      }
    }
  }
  & > svg {
    margin-left: 4px;
    stroke: ${tmDark(({ colors }) => colors.neutral800)};
    ${tmSelectors.hcDark} {
      stroke: ${tmHCDark(({ colors }) => colors.neutral800)};
    }
    ${tmSelectors.dark} {
      stroke: ${tmDark(({ colors }) => colors.neutral800)};
    }
    ${media.mqDark} {
      ${tmSelectors.auto} {
        stroke: ${tmDark(({ colors }) => colors.neutral800)};
      }
    }
  }
`;

const MobileSidebarMenu: FC<Props> = ({
  sidebarElementsList,
  menuItems,
  socialsItems,
}) => {
  const router = useRouter();

  return (
    <MobileSidebarContainer>
      <MobileNavigationContainer>
        {menuItems.map((menuItem) => {
          return (
            <MenuItem
              key={menuItem.label}
              data-current={router?.asPath === menuItem.href}
            >
              <Link href={menuItem.href}>{menuItem.label}</Link>
            </MenuItem>
          );
        })}
        {socialsItems.map((socialItem) => {
          return (
            <MenuItem key={socialItem.name}>
              <a target="_blank" rel="noreferrer" href={socialItem.href}>
                {socialItem.name.toLowerCase()}
              </a>
              <ExternalLinkIcon />
            </MenuItem>
          );
        })}
      </MobileNavigationContainer>
      <Sidebar elementsList={sidebarElementsList} />
    </MobileSidebarContainer>
  );
};

export default MobileSidebarMenu;
