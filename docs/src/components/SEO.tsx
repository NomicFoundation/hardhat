import React from "react";
import Head from "next/head";

interface Props {
  seo: {
    title: string;
    description: string;
  };
}

const commonTitlePart =
  " | Ethereum development environment for professionals by Nomic Foundation";

const SEO = ({ seo }: Props) => {
  const title = `${seo.title}${commonTitlePart}`;
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={seo.description} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="shortcut icon" href="/favicon.ico" />
      <meta property="og:url" content="https://hardhat.org" />
      <meta property="og:image" content="/card.jpg" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={seo.description} />
      <meta name="twitter:card" content="summary_large_image" />
    </Head>
  );
};

export default SEO;
