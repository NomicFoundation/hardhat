import React, { useEffect, useRef, useState } from "react";
import { styled } from "linaria/react";
import { useRouter } from "next/router";
import { MDXRemote, MDXRemoteSerializeResult } from "next-mdx-remote";

import SEO from "./SEO";
import DocsNavigation from "./DocsNavigation";
import Banner, { DefaultBanner } from "./ui/Banner";
import {
  tm,
  tmSelectors,
  tmHCDark,
  tmDark,
  media,
  ThemeProvider,
} from "../themes";
import { DefaultBannerProps } from "./ui/types";
import {
  FooterNavigation,
  IDocumentationSidebarStructure,
  ISeo,
} from "./types";
import Sidebar from "./Sidebar";
import { menuItemsList, socialsItems, bannerContent } from "../config";
import MobileSidebarMenu from "./MobileSidebarMenu";
import DocumentationFooter from "./DocumentationFooter";
import Title from "./mdxComponents/Title";
import Paragraph from "./mdxComponents/Paragraph";
import CodeBlocks from "./mdxComponents/CodeBlocks";
import Admonition from "./mdxComponents/Admonition";
import UnorderedList from "./mdxComponents/UnorderedList";
import HorizontalRule from "./mdxComponents/HorizontalRule";
import MDLink from "./mdxComponents/MDLink";
import Table from "./mdxComponents/Table";
import MDImage from "./mdxComponents/MDImage";
import OrderedList from "./mdxComponents/OrderedList";
import TabsGroup from "./mdxComponents/TabsGroup";
import Tab from "./mdxComponents/Tab";

const Container = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  -webkit-font-smoothing: antialiased;
  main {
    flex: 1 1 auto;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    background-color: ${tm(({ colors }) => colors.neutral0)};
    width: 100%;
    position: relative;
    transition: background-color ease-in-out 0.25s;
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
  height: 100vh;
  min-width: 320px;
`;

export const SidebarMask = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;
export const MobileSidebarMenuMask = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  position: absolute;
  width: 100%;
  left: -100%;
  top: 0;
  transition: all 0.25s ease-in-out;
  &[data-open="true"] {
    left: 0;
  }
`;

export const SidebarContainer = styled.aside<{ isSidebarOpen: boolean }>`
  flex-direction: column;
  width: min(366px, 100%);
  position: fixed;
  top: 136px;
  left: ${(props) => (props.isSidebarOpen ? "0px" : "-120vw")};
  height: calc(100vh - 136px);
  display: flex;
  overflow-y: scroll;
  transition: all ease-out 0.25s;
  z-index: 1;
  background-color: ${tm(({ colors }) => colors.neutral0)};

  ${media.md} {
    left: 0;
  }
  :not(&[data-no-border="true"]) {
    border-right: 1px solid ${tm(({ colors }) => colors.neutral400)};
    ${tmSelectors.hcDark} {
      border-right: 1px solid ${tmHCDark(({ colors }) => colors.border)};
      background-color: ${tmHCDark(({ colors }) => colors.neutral0)};
    }
    ${tmSelectors.dark} {
      border-right: 1px solid ${tmDark(({ colors }) => colors.border)};
      background-color: ${tmDark(({ colors }) => colors.neutral0)};
    }
    ${media.mqDark} {
      ${tmSelectors.auto} {
        border-right: 1px solid ${tmDark(({ colors }) => colors.border)};
        background-color: ${tmDark(({ colors }) => colors.neutral0)};
      }
    }
  }

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

  ${SidebarMask} {
    display: none;
    ${media.md} {
      display: flex;
    }
  }
  ${MobileSidebarMenuMask} {
    display: flex;
    ${media.md} {
      display: none;
    }
  }

  &[data-no-border="true"] {
    border-right: none;
  }
`;

const View = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 24px;
  width: 100%;
  height: calc(100vh - 136px);
  overflow-y: scroll;
  ${media.md} {
    padding-left: 366px;
  }
`;
const Content = styled.section`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 774px;
  padding: 0 34px;

  color: ${tm(({ colors }) => colors.neutral900)};
  & h2:not(:first-of-type) {
    padding-top: 80px;
  }

  & h2 + p {
    margin-top: 32px;
  }

  color: ${tm(({ colors }) => colors.neutral900)};

  ${tmSelectors.hcDark} {
    color: ${tmHCDark(({ colors }) => colors.neutral900)};
  }

  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral900)};
  }

  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.neutral900)};
    }
  }
`;

export const components = {
  h1: Title.H1,
  h2: Title.H2,
  h3: Title.H3,
  h4: Title.H4,
  h5: Title.H5,
  p: Paragraph,
  code: CodeBlocks.Code,
  pre: CodeBlocks.Pre,
  tip: Admonition.Tip,
  warning: Admonition.Warning,
  ul: UnorderedList,
  ol: OrderedList,
  hr: HorizontalRule,
  a: MDLink,
  table: Table,
  img: MDImage,
  tabsgroup: TabsGroup,
  tab: Tab,
};

interface Props {
  seo: ISeo;
  sidebarLayout: IDocumentationSidebarStructure;
  footerNavigation?: FooterNavigation;
  mdxSource: MDXRemoteSerializeResult;
}

const DocumentationLayout = ({
  mdxSource,
  seo,
  sidebarLayout,
  footerNavigation,
}: Props) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  const docViewRef = useRef() as React.MutableRefObject<HTMLInputElement>;

  useEffect(() => {
    docViewRef.current.scrollTo(0, 0);
  }, [router.asPath]);

  useEffect(() => {
    const body = document.querySelector("body");
    if (!body) return;

    if (isSidebarOpen) {
      // Disable scroll
      body.style.overflow = "hidden";
    } else {
      // Enable scroll
      body.style.overflow = "auto";
    }
  }, [isSidebarOpen]);

  useEffect(() => {
    const listener = () => {
      if (isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener("click", listener);

    return () => document.removeEventListener("click", listener);
  }, [isSidebarOpen]);

  return (
    <ThemeProvider>
      <Container>
        <Banner
          content={bannerContent}
          renderContent={({ content }: DefaultBannerProps) => (
            <DefaultBanner content={content} />
          )}
        />
        <DocsNavigation
          isSidebarOpen={isSidebarOpen}
          onSidebarOpen={setIsSidebarOpen}
        />
        <SEO seo={seo} />

        <main>
          <SidebarContainer
            onClick={(e) => {
              e.stopPropagation();
            }}
            isSidebarOpen={isSidebarOpen}
          >
            <SidebarMask>
              <Sidebar elementsList={sidebarLayout} />
            </SidebarMask>
            <MobileSidebarMenuMask data-open={isSidebarOpen}>
              <MobileSidebarMenu
                menuItems={menuItemsList}
                socialsItems={socialsItems}
                sidebarElementsList={sidebarLayout}
              />
            </MobileSidebarMenuMask>
          </SidebarContainer>
          <View ref={docViewRef}>
            <Content>
              {/* @ts-ignore */}
              <MDXRemote {...mdxSource} components={components} />
            </Content>
            {footerNavigation ? (
              <DocumentationFooter
                next={footerNavigation.next}
                prev={footerNavigation.prev}
                lastEditDate={footerNavigation.lastEditDate}
                editLink={footerNavigation.editLink}
              />
            ) : null}
          </View>
        </main>
      </Container>
    </ThemeProvider>
  );
};

export default DocumentationLayout;
