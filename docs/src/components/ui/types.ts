import React from "react";

export interface MenuItemType {
  label: string;
  href: string;
  subItems?: MenuItemType[];
  prefix?: string;
  icon?: React.FC<any>;
  iconDark?: React.FC<any>;
}

export enum SocialsEnum {
  GITHUB = "GITHUB",
  TWITTER = "TWITTER",
  DISCORD = "DISCORD",
}

export interface SocialsItem {
  name: SocialsEnum;
  href: string;
  Icon: React.FC;
}

export interface MenuProps {
  menuItems: MenuItemType[];
  isOpen?: boolean;
  socialsItems: SocialsItem[];
  isDocumentation?: boolean;
}

export interface CTAType {
  title: string;
  url: string;
}

export enum Tools {
  RUNNER = "RUNNER",
  IGNITION = "IGNITION",
  NETWORK = "NETWORK",
  SOLIDITY = "SOLIDITY",
}

interface DefaultBannerContent {
  text: string;
  href: string;
}
export interface BannerProps {
  content: DefaultBannerContent;
  renderContent: ({
    content,
  }: {
    content: DefaultBannerContent;
  }) => JSX.Element;
}
export interface DefaultBannerProps {
  content: DefaultBannerContent;
}
