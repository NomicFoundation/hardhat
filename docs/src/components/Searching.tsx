import React from "react";
import Head from "next/head";
import { DocSearch } from "@docsearch/react";
import "@docsearch/css";
import { styled } from "linaria/react";
import { media, tm, tmDark, tmSelectors } from "../themes";

const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID as string;
const apiKey = process.env.NEXT_PUBLIC_ALGOLIA_API_KEY as string;
const indexName = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME as string;

const Container = styled.div`
  .DocSearch-Button {
    border-radius: 4px;
    border: 1px solid ${tm(({ colors }) => colors.codeBlockBorder)};
    width: 200px;
    font-size: 15px;
    font-weight: 300;
  }

  .DocSearch-Button-Keys {
    display: none;
  }

  display: flex;
  --docsearch-searchbox-shadow-custom: ${tm(
    ({ colors }) => colors.searchShadow
  )};
  --docsearch-searchbox-background: ${tm(({ colors }) => colors.neutral0)};
  --docsearch-primary-color: ${tm(({ colors }) => colors.accent700)};
  --docsearch-text-color: ${tm(({ colors }) => colors.neutral800)};
  --docsearch-searchbox-focus-background: ${tm(
    ({ colors }) => colors.neutral0
  )};
  --docsearch-highlight-color: var(--docsearch-primary-color);
  --docsearch-muted-color: var(--docsearch-text-color);
  --docsearch-searchbox-shadow: inset 0 0 0 2px
    var(--docsearch-searchbox-shadow-custom);
  --docsearch-spacing: 12px;

  ${tmSelectors.dark} {
    --docsearch-searchbox-background: ${tmDark(
      ({ colors }) => colors.neutral0
    )};
    --docsearch-primary-color: ${tmDark(({ colors }) => colors.accent700)};
    --docsearch-text-color: ${tmDark(({ colors }) => colors.neutral800)};
    --docsearch-searchbox-focus-background: ${tmDark(
      ({ colors }) => colors.neutral0
    )};
    --docsearch-searchbox-shadow-custom: ${tmDark(
      ({ colors }) => colors.searchShadow
    )};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      --docsearch-searchbox-background: ${tmDark(
        ({ colors }) => colors.neutral0
      )};
      --docsearch-primary-color: ${tmDark(({ colors }) => colors.accent700)};
      --docsearch-text-color: ${tmDark(({ colors }) => colors.neutral800)};
      --docsearch-searchbox-focus-background: ${tmDark(
        ({ colors }) => colors.neutral0
      )};
      --docsearch-searchbox-shadow-custom: ${tmDark(
        ({ colors }) => colors.searchShadow
      )};
    }
  }
  .landing & {
    visibility: hidden;
  }
`;

const Searching = () => {
  return (
    <Container>
      <Head>
        {/**
         * By adding this snippet to the head, we can hint the browser that the website will load data from Algolia,
         * and allows it to preconnect to the DocSearch cluster. It makes the first query faster,
         * especially on mobile.
         *
         * But we don't want to affect landing pages where we don't use searching. So we adding this only on pages
         * where we actually using this
         */}
        <link
          rel="preconnect"
          href={`https://${appId}-dsn.algolia.net`}
          crossOrigin="true"
        />
      </Head>
      <DocSearch appId={appId} apiKey={apiKey} indexName={indexName} />
    </Container>
  );
};

export default Searching;
