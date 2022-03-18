import { MenuItemType } from './components/ui/types';

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
