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
    </Head>
  );
};

export default SEO;
