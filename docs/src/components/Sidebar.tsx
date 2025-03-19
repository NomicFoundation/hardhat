import React from "react";
import { useRouter } from "next/router";
import Link from "next/link";

import { styled } from "linaria/react";
import { media, tm, tmDark, tmSelectors } from "../themes";
import { IDocumentationSidebarStructure } from "./types";

interface Props {
  elementsList: IDocumentationSidebarStructure;
  closeSidebar?: () => void;
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
  width: 100%;

  &:hover {
    color: ${tm(({ colors }) => colors.accent700)};
  }

  &[data-active="true"] {
    color: ${tm(({ colors }) => colors.accent700)};
    &.heading {
      border-left: 4px solid ${tm(({ colors }) => colors.transparent)};
    }
  }
  &[data-anchor="true"][data-active="true"] {
    color: ${tm(({ colors }) => colors.accent700)};
    background-color: ${tm(({ colors }) => colors.accent200)};
  }

  ${tmSelectors.dark} {
    &[data-active="true"] {
      color: ${tmDark(({ colors }) => colors.accent700)};
      border-color: ${tmDark(({ colors }) => colors.accent700)};
    }
    &[data-anchor="true"][data-active="true"] {
      color: ${tmDark(({ colors }) => colors.accent700)};
      background-color: ${tmDark(({ colors }) => colors.accent200)};
    }
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      &[data-active="true"] {
        color: ${tmDark(({ colors }) => colors.accent700)};
        border-color: ${tmDark(({ colors }) => colors.accent700)};
      }
      &[data-anchor="true"][data-active="true"] {
        color: ${tmDark(({ colors }) => colors.accent700)};
        background-color: ${tmDark(({ colors }) => colors.accent200)};
      }
    }
  }
`;

const SidebarItem = styled.li`
  display: flex;
  flex-direction: column;
  & ${SidebarLinkWrapper} {
    padding: 4px 28px;
    &[data-active="true"] {
      background-color: ${tm(({ colors }) => colors.accent200)};
      &.heading {
        background-color: unset;
      }
      ${tmSelectors.dark} {
        background-color: ${tmDark(({ colors }) => colors.accent200)};
        &.heading {
          background-color: unset;
        }
      }
      ${media.mqDark} {
        ${tmSelectors.auto} {
          background-color: ${tmDark(({ colors }) => colors.accent200)};
          &.heading {
            background-color: unset;
          }
        }
      }
    }
  }
  &.group:not(:first-child) {
    margin-top: 16px;
  }
`;

const SidebarHeading = styled.p`
  font-weight: 700;
  font-size: 17px;
  line-height: 25px;
  padding: 4px 32px;
  border-left: 4px solid ${tm(({ colors }) => colors.transparent)};

  &[data-child-active="true"] {
    color: ${tm(({ colors }) => colors.accent700)};
    border-color: ${tm(({ colors }) => colors.accent700)};

    ${tmSelectors.dark} {
      color: ${tmDark(({ colors }) => colors.accent700)};
      border-color: ${tmDark(({ colors }) => colors.accent700)};
    }
    ${media.mqDark} {
      ${tmSelectors.auto} {
        color: ${tmDark(({ colors }) => colors.accent700)};
        border-color: ${tmDark(({ colors }) => colors.accent700)};
      }
    }
  }
`;

const SidebarSubLinksList = styled.ul`
  display: flex;
  flex-direction: column;
  line-height: 28px;
  list-style-type: none;
  & li > a {
    width: 100%;
    display: block;
  }
  & ${SidebarLinkWrapper} {
    padding: 0.5px 16px 0.5px 64px;
  }
`;

const Sidebar = ({ elementsList, closeSidebar }: Props) => {
  const router = useRouter();
  return (
    <Container>
      {elementsList?.map((sidebarItem) => {
        const isLinkActive: boolean =
          sidebarItem.href !== undefined &&
          router?.asPath.indexOf(sidebarItem.href) > -1;
        const hasActiveChild =
          sidebarItem?.children?.find(
            (child) =>
              router?.asPath.replace(/\//g, "") ===
              child.href.replace(/\//g, "")
          ) !== undefined;
        return (
          <SidebarItem
            key={sidebarItem.label}
            className={sidebarItem.type}
            onClick={closeSidebar}
          >
            {sidebarItem.href !== undefined ? (
              <Link passHref href={sidebarItem.href}>
                <SidebarLinkWrapper
                  data-active={isLinkActive}
                  className="heading"
                >
                  {sidebarItem.label}
                </SidebarLinkWrapper>
              </Link>
            ) : (
              <SidebarHeading data-child-active={hasActiveChild}>
                {sidebarItem.label}
              </SidebarHeading>
            )}

            {sidebarItem?.children && (
              <SidebarSubLinksList>
                {sidebarItem.children.map((subItem) => {
                  const isSubLinkActive =
                    router?.asPath.replace(/\//g, "") ===
                    subItem.href.replace(/\//g, "");

                  const isAnchor = subItem.href.includes("#");
                  return (
                    // eslint-disable-next-line
                    <li key={subItem.label} onClick={closeSidebar}>
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
