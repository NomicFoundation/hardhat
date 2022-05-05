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
import { ISeo } from "./types";
import { bannerContent } from "../config";

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
}>;

const PluginsLayout = ({ children, seo }: Props) => {
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
          <View ref={docViewRef}>
            <Content>{children}</Content>
          </View>
        </main>
      </Container>
    </ThemeProvider>
  );
};

export default PluginsLayout;
