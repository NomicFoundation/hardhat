import React from "react";
import type { AppProps } from "next/app";
import "../styles/globals.css";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      {/* @ts-ignore */}
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
