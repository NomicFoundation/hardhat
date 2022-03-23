export type MenuItemType = {
  label: string;
  href: string;
  subItems?: Array<MenuItemType>;
  prefix?: string;
};

export enum SocialsEnum {
  GIT_HUB = 'GIT_HUB',
  TWITTER = 'TWITTER',
  DISCORD = 'DISCORD',
}

export type SocialsItem = {
  name: SocialsEnum;
  href: string;
  Icon: React.FC;
};

export type MenuProps = {
  menuItems: Array<MenuItemType>;
  isOpen?: boolean;
  socialsItems: Array<SocialsItem>;
};

export type CTAType = {
  title: string;
  url: string;
};
