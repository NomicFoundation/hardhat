import React from "react";
import { useRouter } from "next/router";
import Link from "next/link";

import { styled } from "linaria/react";
import { media, tm, tmDark, tmHCDark, tmSelectors } from "../themes";
import { IDocumentationSidebarStructure } from "./types";

interface Props {
  elementsList: IDocumentationSidebarStructure;
}

const Container = styled.ul`
  padding: 16px 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  list-style-type: none;
  color: ${tm(({ colors }) => colors.neutral800)};
  font-weight: 400;
  font-size: 15px;
  line-height: 28px;
  letter-spacing: 0em;
  ${tmSelectors.hcDark} {
    color: ${tmHCDark(({ colors }) => colors.neutral800)};
  }
  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral800)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.neutral800)};
    }
  }
`;

const SidebarLinkWrapper = styled.a`
  cursor: pointer;
  &:hover {
    color: ${tm(({ colors }) => colors.accent700)};
  }
  &[data-active="true"] {
    color: ${tm(({ colors }) => colors.accent700)};
  }
`;

const SidebarItem = styled.li`
  display: flex;
  flex-direction: column;
  & ${SidebarLinkWrapper} {
    border-left: 4px solid ${tm(({ colors }) => colors.transparent)};
    padding: 4px 28px;
    &[data-active="true"] {
      border-color: ${tm(({ colors }) => colors.accent700)};
    }
  }
  &.group {
    margin-top: 16px;
  }
`;

const SidebarHeading = styled.p`
  font-weight: 700;
  font-size: 17px;
  line-height: 25px;
  padding: 4px 32px;
`;

const SidebarSubLinksList = styled.ul`
  display: flex;
  flex-direction: column;
  line-height: 28px;
  list-style-type: none;
  & ${SidebarLinkWrapper} {
    padding: 0.5px 16px 0.5px 64px;
    &[data-anchor="true"] {
      border-left: 4px solid ${tm(({ colors }) => colors.transparent)};
    }
  }
`;

const Sidebar = ({ elementsList }: Props) => {
  const router = useRouter();
  return (
    <Container>
      {elementsList?.map((sidebarItem) => {
        const isLinkActive: boolean =
          sidebarItem.href !== undefined &&
          router?.asPath.indexOf(sidebarItem.href) > -1;
        return (
          <SidebarItem key={sidebarItem.label} className={sidebarItem.type}>
            {sidebarItem.href !== undefined ? (
              <Link passHref href={sidebarItem.href}>
                <SidebarLinkWrapper data-active={isLinkActive}>
                  {sidebarItem.label}
                </SidebarLinkWrapper>
              </Link>
            ) : (
              <SidebarHeading>{sidebarItem.label}</SidebarHeading>
            )}

            {sidebarItem?.children && (
              <SidebarSubLinksList>
                {sidebarItem.children.map((subItem) => {
                  const isSubLinkActive =
                    router?.asPath.replace(/\//g, "") ===
                    subItem.href.replace(/\//g, "");

                  const isAnchor = subItem.href.includes("#");
                  return (
                    <li key={subItem.label}>
                      <Link passHref href={subItem.href}>
                        <SidebarLinkWrapper
                          data-active={isSubLinkActive}
                          data-anchor={isAnchor}
                        >
                          {subItem.label}
                        </SidebarLinkWrapper>
                      </Link>
                    </li>
                  );
                })}
              </SidebarSubLinksList>
            )}
          </SidebarItem>
        );
      })}
    </Container>
  );
};

export default Sidebar;
