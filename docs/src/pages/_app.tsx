import React from "react";
import type { AppProps } from "next/app";
import "../styles/globals.css";
// TODO: move prisma.css import to DocumentsLayout
import "../styles/prism.css";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      {/* @ts-ignore */}
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
