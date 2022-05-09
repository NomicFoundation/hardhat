import React from "react";
import type { AppProps } from "next/app";
import "../styles/globals.css";
// TODO: move prisma.css import to DocumentsLayout
import "../styles/prism.css";
import { TabsProvider } from "../global-tabs";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <TabsProvider>
      {/* @ts-ignore */}
      <Component {...pageProps} />
    </TabsProvider>
  );
}

export default MyApp;
