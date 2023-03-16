import React from "react";
import Admonition from "./Admonition";
import { mdWrapper } from "../../../.storybook/common-decorators";

export default {
  title: "MDX components/Admonition",
  decorators: [mdWrapper],
};

export const Tip = () => (
  <Admonition.Tip>
    Hardhat will let you know how, but, in case you missed it, you can install
    them with
  </Admonition.Tip>
);

export const Warning = () => (
  <Admonition.Warning>
    Do not send mainnet Ether to the addresses above. Those addresses are
    deterministic: they are the same for all Hardhat users. Accordingly, the
    private keys for these addresses are well known, so there are probably bots
    monitoring those addresses on mainnet, waiting to withdraw any funds sent to
    them. If you add any of these accounts to a wallet (eg Metamask), be very
    careful to avoid sending any mainnet Ether to them: consider naming the
    account something like Hardhat - Unsafe in order to prevent any mistakes.
  </Admonition.Warning>
);
