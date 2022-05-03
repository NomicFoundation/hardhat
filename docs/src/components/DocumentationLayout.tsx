import React, { useEffect, useRef, useState } from "react";
import { styled } from "linaria/react";
import { useRouter } from "next/router";
import SEO from "./SEO";
import Navigation from "./Navigation";
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

const Container = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
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

const SidebarMask = styled.div`
  display: flex;
  flex-direction: column;
  border-right: 1px solid ${tm(({ colors }) => colors.neutral400)};
  ${tmSelectors.hcDark} {
    border-right: 1px solid ${tmHCDark(({ colors }) => colors.border)};
  }
  ${tmSelectors.dark} {
    border-right: 1px solid ${tmDark(({ colors }) => colors.border)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      border-right: 1px solid ${tmDark(({ colors }) => colors.border)};
    }
  }
`;
const MobileSidebarMenuMask = styled.div`
  display: flex;
  flex-direction: column;
  position: absolute;
  width: 100%;
  left: -100%;
  top: 0;
  transition: all 0.25s ease-in-out;
  border-right: 1px solid ${tm(({ colors }) => colors.neutral400)};
  &[data-open="true"] {
    left: 0;
  }
  ${tmSelectors.hcDark} {
    border-right: ${tmHCDark(({ colors }) => colors.neutral400)};
  }
  ${tmSelectors.dark} {
    border-right: ${tmDark(({ colors }) => colors.neutral400)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      border-right: ${tmDark(({ colors }) => colors.neutral400)};
    }
  }
  ${tmSelectors.hcDark} {
    border-right: ${tmHCDark(({ colors }) => colors.neutral400)};
  }
  ${tmSelectors.dark} {
    border-right: ${tmDark(({ colors }) => colors.neutral400)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      border-right: ${tmDark(({ colors }) => colors.neutral400)};
    }
  }
`;

const SidebarContainer = styled.aside<{ isSidebarOpen: boolean }>`
  flex-direction: column;
  width: 366px;
  position: fixed;
  top: 136px;
  left: ${(props) => (props.isSidebarOpen ? "0px" : "-120vw")};
  height: 85vh;
  display: flex;
  overflow-y: scroll;
  transition: all ease-out 0.25s;
  z-index: 1;
  ${media.md} {
    left: 0;
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
`;

const View = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 24px;
  width: 100%;
  height: 85vh;
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
  padding-left: 34px;
  color: ${tm(({ colors }) => colors.neutral900)};
  padding: 0 40px 0 34px;

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

type Props = React.PropsWithChildren<{
  seo: ISeo;
  sidebarLayout: IDocumentationSidebarStructure;
  footerNavigation: FooterNavigation;
}>;

const DocumentationLayout = ({
  children,
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
        <Navigation
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
              {children}
              <DocumentationFooter
                next={footerNavigation.next}
                prev={footerNavigation.prev}
                lastEditDate={footerNavigation.lastEditDate}
                editLink={footerNavigation.editLink}
              />
            </Content>
          </View>
        </main>
      </Container>
    </ThemeProvider>
  );
};

export default DocumentationLayout;
