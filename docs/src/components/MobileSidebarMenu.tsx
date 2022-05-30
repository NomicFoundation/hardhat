import React, { FC } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { styled } from "linaria/react";
import { media, tm, tmDark, tmHCDark, tmSelectors } from "../themes";
import Sidebar from "./Sidebar";
import { menuItemsList, socialsItems as defaultSocialItems } from "../config";
import ExternalLinkIcon from "../assets/icons/external-link-icon";
import { IDocumentationSidebarStructure } from "./types";
import { SocialsEnum } from "./ui/types";

interface Props {
  sidebarElementsList: IDocumentationSidebarStructure;
  menuItems: typeof menuItemsList;
  socialsItems: typeof defaultSocialItems;
  closeSidebar: () => void;
}

const MobileSidebarContainer = styled.section`
  display: flex;
  flex-direction: column;
`;

const MobileNavigationContainer = styled.ul`
  list-style-type: none;
  display: flex;
  flex-direction: column;
  padding: 16px 0;
  color: ${tm(({ colors }) => colors.neutral800)};
  border-bottom: 1px solid ${tm(({ colors }) => colors.neutral400)};
  ${tmSelectors.hcDark} {
    border-bottom: 1px solid ${tmHCDark(({ colors }) => colors.neutral400)};
    color: ${tmHCDark(({ colors }) => colors.neutral800)};
  }
  ${tmSelectors.dark} {
    border-bottom: 1px solid ${tmDark(({ colors }) => colors.neutral400)};
    color: ${tmDark(({ colors }) => colors.neutral800)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      border-bottom: 1px solid ${tmDark(({ colors }) => colors.neutral400)};
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
  &:hover {
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
  }
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

const SocialItem = ({ name, href }: { name: SocialsEnum; href: string }) => {
  return (
    <MenuItem key={name}>
      <a target="_blank" rel="noreferrer" href={href}>
        {name.toLowerCase()}
      </a>
      <ExternalLinkIcon />
    </MenuItem>
  );
};

const MobileSidebarMenu: FC<Props> = ({
  sidebarElementsList,
  menuItems,
  socialsItems,
  closeSidebar,
}) => {
  const router = useRouter();
  const gitHubSocial = socialsItems.find(
    (socialsItem) => socialsItem.name === SocialsEnum.GITHUB
  );

  return (
    <MobileSidebarContainer>
      <MobileNavigationContainer>
        {menuItems.map((menuItem) => {
          return (
            <MenuItem
              key={menuItem.label}
              data-current={router?.asPath === menuItem.href}
              onClick={closeSidebar}
            >
              <Link href={menuItem.href}>{menuItem.label}</Link>
            </MenuItem>
          );
        })}
        {gitHubSocial && <SocialItem {...gitHubSocial} />}
      </MobileNavigationContainer>
      <Sidebar elementsList={sidebarElementsList} closeSidebar={closeSidebar} />
    </MobileSidebarContainer>
  );
};

export default MobileSidebarMenu;
