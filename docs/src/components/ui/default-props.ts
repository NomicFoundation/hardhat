import { MenuItemType, SocialsEnum } from './types';
import GitHubLogo from '../../assets/socials/gh-logo';
import TwitterLogo from '../../assets/socials/tw-logo';
import DiscordLogo from '../../assets/socials/dc-logo';

export const defaultMenuItemsList: Array<MenuItemType> = [
  {
    label: 'Home',
    href: '/',
  },
  {
    label: 'Tools',
    href: '/tools',
    subItems: [
      {
        prefix: 'Hardhat',
        label: 'Runner',
        href: '/tools/runner',
      },
      {
        prefix: 'Hardhat',
        label: 'Ignition',
        href: '/tools/ignition',
      },
      {
        prefix: 'Hardhat',
        label: 'Network',
        href: '/tools/network',
      },
      {
        prefix: 'Hardhat',
        label: 'Solidity',
        href: '/tools/solidity',
      },
    ],
  },
  {
    label: 'Plugins',
    href: '/plugins',
  },
  {
    label: 'Documents',
    href: '/documents',
  },
  {
    label: 'Tutorial',
    href: '/tutorial',
  },
];

export const defaultSocialsItems = [
  {
    name: SocialsEnum.GIT_HUB,
    href: 'https://github.com/NomicFoundation/hardhat',
    Icon: GitHubLogo,
  },
  {
    name: SocialsEnum.TWITTER,
    href: 'https://twitter.com/HardhatHQ',
    Icon: TwitterLogo,
  },
  {
    name: SocialsEnum.DISCORD,
    href: 'https://discord.com/invite/TETZs2KK4k',
    Icon: DiscordLogo,
  },
];
