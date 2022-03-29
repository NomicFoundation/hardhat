export interface MenuItemType {
  label: string;
  href: string;
  subItems?: MenuItemType[];
  prefix?: string;
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
}

export interface CTAType {
  title: string;
  url: string;
}

export enum Tools {
  RUNNER = "RUNNER",
  IGNITION = "IGNITION",
  NETWORK = "NETWORK",
  VS_CODE = "VS_CODE",
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
