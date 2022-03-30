import React from "react";
import Head from "next/head";

interface Props {
  seo: {
    title: string;
  };
}

const SEO = ({ seo }: Props) => {
  return (
    <Head>
      <title>{seo.title}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </Head>
  );
};

export default SEO;
