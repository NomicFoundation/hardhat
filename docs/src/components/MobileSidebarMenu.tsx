import React, {
  Dispatch,
  FC,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { styled } from "linaria/react";
import { headerTotalHeight, media, tm, tmDark, tmSelectors } from "../themes";
import Sidebar from "./Sidebar";
import { menuItemsList, socialsItems as defaultSocialItems } from "../config";
import ExternalLinkIcon from "../assets/icons/external-link-icon";
import { IDocumentationSidebarStructure } from "./types";
import { MenuItemType, NavigationPagesPaths, SocialsEnum } from "./ui/types";
import MobileMenuArrowForward from "../assets/icons/mobile-menu-arrow-forward";
import { SocialsList } from "./ui/DesktopMenu";
import ThemeSwitchButton from "./ThemeSwitchButton";
import MobileMenuArrowBack from "../assets/icons/mobile-menu-arrow-back";

interface Props {
  sidebarElementsList: IDocumentationSidebarStructure;
  menuItems: typeof menuItemsList;
  socialsItems: typeof defaultSocialItems;
  closeSidebar: () => void;
  isDocumentation: boolean;
}

interface ModalProps {
  modalState: MenuItemType | null;
  setModalState: Dispatch<SetStateAction<MenuItemType | null>>;
  closeSidebar: () => void;
  sidebarElementsList: IDocumentationSidebarStructure;
  socialsItems: typeof defaultSocialItems;
}

const MobileSidebarContainer = styled.section`
  display: flex;
  flex-direction: column;
`;

const MobileNavigationContainer = styled.ul`
  list-style-type: none;
  display: flex;
  flex-direction: column;
  padding: 16px 0;
  color: ${tm(({ colors }) => colors.neutral900)};
  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral900)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.neutral900)};
    }
  }
`;

const MenuItem = styled.li`
  padding: 8px 32px;
  display: flex;
  align-items: center;
  font-size: 24px;
  font-weight: 400;
  text-transform: uppercase;
  font-family: ChivoRegular, sans-serif;
  cursor: pointer;
  margin-top: 8px;

  &:first-child {
    margin-top: unset;
  }
  &:hover {
    color: ${tm(({ colors }) => colors.accent700)};
    & svg {
      stroke: ${tm(({ colors }) => colors.accent700)};
      fill: ${tm(({ colors }) => colors.accent700)};
    }
    & a:after {
      background-color: ${tm(({ colors }) => colors.accent700)};
    }

    ${tmSelectors.dark} {
      color: ${tmDark(({ colors }) => colors.accent700)};
      & svg {
        stroke: ${tmDark(({ colors }) => colors.accent700)};
        fill: ${tmDark(({ colors }) => colors.accent700)};
      }
      & a:after {
        background-color: ${tmDark(({ colors }) => colors.accent700)};
      }
    }
    ${media.mqDark} {
      ${tmSelectors.auto} {
        color: ${tmDark(({ colors }) => colors.accent700)};
        & svg {
          stroke: ${tmDark(({ colors }) => colors.accent700)};
          fill: ${tmDark(({ colors }) => colors.accent700)};
        }
        & a:after {
          background-color: ${tmDark(({ colors }) => colors.accent700)};
        }
      }
    }
  }
  & > a {
    position: relative;
    &:after {
      transition: all ease-in-out 0.2s;
      position: absolute;
      bottom: -8px;
      left: 0;
      content: " ";
      width: 0;
      height: 1px;
      background-color: ${tm(({ colors }) => colors.neutral800)};

      ${tmSelectors.dark} {
        background-color: ${tmDark(({ colors }) => colors.neutral800)};
      }
      ${media.mqDark} {
        ${tmSelectors.auto} {
          background-color: ${tmDark(({ colors }) => colors.neutral800)};
        }
      }
    }
  }
  &[data-current="true"] {
    & > a {
      &:after {
        width: 100%;
      }
    }
  }
  & svg {
    margin-left: 4px;
    stroke: ${tm(({ colors }) => colors.neutral900)};
    fill: ${tm(({ colors }) => colors.neutral900)};

    ${tmSelectors.dark} {
      stroke: ${tmDark(({ colors }) => colors.neutral900)};
      fill: ${tmDark(({ colors }) => colors.neutral900)};
    }
    ${media.mqDark} {
      ${tmSelectors.auto} {
        stroke: ${tmDark(({ colors }) => colors.neutral900)};
        fill: ${tmDark(({ colors }) => colors.neutral900)};
      }
    }
  }
`;

const MobileMenuFooter = styled.div<{ isRelative?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 16px 40px 32px;
  position: ${({ isRelative }) => (isRelative ? "relative" : "absolute")};
  bottom: 0;
  &::before {
    content: " ";
    height: 1px;
    width: 200px;
    position: absolute;
    top: 0;
    left: 32px;
    background-color: ${tm(({ colors }) => colors.border)};
    ${tmSelectors.dark} {
      background-color: ${tmDark(({ colors }) => colors.border)};
    }
    ${media.mqDark} {
      ${tmSelectors.auto} {
        background-color: ${tmDark(({ colors }) => colors.border)};
      }
    }
  }
`;

const ModalContainer = styled.div<{ isModalOpen: boolean }>`
  display: flex;
  flex-direction: column;
  height: calc(100vh - ${headerTotalHeight});
  padding: 32px 0;
  position: absolute;
  width: 100%;
  top: 0px;
  transition: all ease-out 0.25s;
  font-family: ChivoRegular, sans-serif;
  z-index: 50;
  left: ${({ isModalOpen }) => (isModalOpen ? "0px" : "-120vw")};
  color: ${tm(({ colors }) => colors.neutral800)};
  background-color: ${tm(({ colors }) => colors.neutral0)};

  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral800)};
    background-color: ${tmDark(({ colors }) => colors.neutral0)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.neutral800)};
      background-color: ${tmDark(({ colors }) => colors.neutral0)};
    }
  }
`;

const ModalBackToMenuButton = styled.button`
  margin-left: 32px;
  display: flex;
  align-items: center;
  font-size: 15px;
  line-height: 20px;
  width: fit-content;
  background-color: ${tm(({ colors }) => colors.transparent)};
  border: none;
  color: ${tm(({ colors }) => colors.backButton)};
  cursor: pointer;
  &:hover {
    opacity: 0.8;
  }
  & svg {
    margin-right: 6px;
    stroke: ${tm(({ colors }) => colors.backButton)};
    fill: ${tm(({ colors }) => colors.backButton)};
  }
  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.backButton)};
    & svg {
      stroke: ${tmDark(({ colors }) => colors.backButton)};
      fill: ${tmDark(({ colors }) => colors.backButton)};
    }
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.backButton)};
      & svg {
        stroke: ${tmDark(({ colors }) => colors.backButton)};
        fill: ${tmDark(({ colors }) => colors.backButton)};
      }
    }
  }
`;

const ModalTitle = styled.h4`
  margin: 16px 32px 8px;
  font-size: 24px;
  font-weight: 400;
  width: fit-content;
  text-transform: uppercase;
  position: relative;
  color: ${tm(({ colors }) => colors.neutral900)};
  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral900)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.neutral900)};
    }
  }
  &:after {
    transition: all ease-in-out 0.2s;
    position: absolute;
    bottom: -8px;
    left: 0;
    content: " ";
    width: 100%;
    height: 1px;
    background-color: ${tm(({ colors }) => colors.neutral900)};

    ${tmSelectors.dark} {
      background-color: ${tmDark(({ colors }) => colors.neutral900)};
    }
    ${media.mqDark} {
      ${tmSelectors.auto} {
        background-color: ${tmDark(({ colors }) => colors.neutral900)};
      }
    }
  }
`;

const ToolsList = styled.ul`
  display: flex;
  flex-direction: column;
  user-select: none;
  list-style-type: none;
  font-size: 16.5px;
  line-height: 150%;
  font-weight: 400;
  padding: 19.5px 32px;
`;

const ToolsListItem = styled.li`
  margin-top: 15px;
  &:first-child {
    margin-top: unset;
  }
`;

const SocialItem = ({ name, href }: { name: SocialsEnum; href: string }) => {
  return (
    <MenuItem key={name}>
      <a target="_blank" rel="noreferrer" href={href}>
        {name.toLowerCase()}
      </a>
      <ExternalLinkIcon style={{ fill: "none" }} />
    </MenuItem>
  );
};

const getCurrentSection = ({
  isDocumentation,
  currentLocation,
}: {
  isDocumentation: boolean;
  currentLocation: string;
}): NavigationPagesPaths => {
  if (isDocumentation) {
    if (currentLocation.startsWith(NavigationPagesPaths.TUTORIAL))
      return NavigationPagesPaths.TUTORIAL;
    return NavigationPagesPaths.DOCUMENTATION;
  }
  return currentLocation as NavigationPagesPaths;
};

const MobileSidebarMenuModal: FC<ModalProps> = ({
  modalState,
  setModalState,
  sidebarElementsList,
  closeSidebar,
  socialsItems,
}) => {
  const renderModalContent = (
    selectedSection: NavigationPagesPaths | string
  ) => {
    if (selectedSection === NavigationPagesPaths.TOOLS) {
      return (
        <ToolsList>
          {modalState?.subItems?.map((subItem) => {
            return (
              <ToolsListItem key={subItem.href}>
                <Link passHref scroll={false} href={subItem.href}>
                  {/* eslint-disable-next-line */}
                  <a onClick={closeSidebar}>{`${subItem.prefix as string} ${
                    subItem.label
                  }`}</a>
                </Link>
              </ToolsListItem>
            );
          })}
        </ToolsList>
      );
    }
    return (
      <Sidebar elementsList={sidebarElementsList} closeSidebar={closeSidebar} />
    );
  };

  return (
    <ModalContainer isModalOpen={modalState !== null}>
      <ModalBackToMenuButton onClick={() => setModalState(null)}>
        <MobileMenuArrowBack />
        Back
      </ModalBackToMenuButton>
      <ModalTitle>{modalState?.label}</ModalTitle>
      {modalState !== null && renderModalContent(modalState.href)}
      <MobileMenuFooter isRelative>
        <SocialsList socialsItems={socialsItems} isMobile />
        <ThemeSwitchButton isMobile />
      </MobileMenuFooter>
    </ModalContainer>
  );
};

const MobileSidebarMenu: FC<Props> = ({
  sidebarElementsList,
  closeSidebar,
  menuItems,
  socialsItems,
  isDocumentation = false,
}) => {
  const router = useRouter();
  const [modalState, setModalState] = useState<MenuItemType | null>(null);
  const gitHubSocial = socialsItems.find(
    (socialsItem) => socialsItem.name === SocialsEnum.GITHUB
  );
  const currentSection = getCurrentSection({
    isDocumentation,
    currentLocation: router?.asPath,
  });
  const isModal = useMemo(
    () =>
      [
        NavigationPagesPaths.DOCUMENTATION,
        NavigationPagesPaths.TUTORIAL,
        NavigationPagesPaths.TOOLS,
      ].includes(currentSection),
    [currentSection]
  );

  useEffect(() => {
    if (isModal) {
      setModalState(
        menuItems.find((menuItem) => menuItem.href === currentSection) || null
      );
    }
  }, [currentSection, menuItems, isModal]);

  const handleClick = (
    event: React.MouseEvent<HTMLLIElement, MouseEvent>,
    menuItem: MenuItemType
  ) => {
    if (
      menuItem.href === NavigationPagesPaths.TOOLS ||
      ([
        NavigationPagesPaths.DOCUMENTATION,
        NavigationPagesPaths.TUTORIAL,
      ].includes(currentSection) &&
        currentSection === menuItem.href)
    ) {
      event.preventDefault();
      setModalState(menuItem);
    } else {
      closeSidebar();
    }
  };

  return (
    <MobileSidebarContainer>
      <MobileNavigationContainer>
        {menuItems.map((menuItem) => {
          return (
            <MenuItem
              key={menuItem.label}
              data-current={currentSection === menuItem.href}
              onClick={(e) => handleClick(e, menuItem)}
            >
              <Link href={menuItem.href}>
                {/* eslint-disable-next-line */}
                <a
                  onClick={(e) => {
                    if (
                      menuItem.href === NavigationPagesPaths.TOOLS ||
                      ([
                        NavigationPagesPaths.DOCUMENTATION,
                        NavigationPagesPaths.TUTORIAL,
                      ].includes(currentSection) &&
                        currentSection === menuItem.href)
                    ) {
                      e.preventDefault();
                    }
                  }}
                >
                  {menuItem.label}
                </a>
              </Link>
              {sidebarElementsList.length > 0 &&
                currentSection === menuItem.href && (
                  <MobileMenuArrowForward style={{ marginLeft: "auto" }} />
                )}
            </MenuItem>
          );
        })}
        {gitHubSocial && <SocialItem {...gitHubSocial} />}
      </MobileNavigationContainer>
      <MobileMenuFooter>
        <SocialsList socialsItems={socialsItems} isMobile />
        <ThemeSwitchButton isMobile />
      </MobileMenuFooter>

      <MobileSidebarMenuModal
        modalState={modalState}
        setModalState={setModalState}
        sidebarElementsList={sidebarElementsList}
        closeSidebar={closeSidebar}
        socialsItems={socialsItems}
      />
    </MobileSidebarContainer>
  );
};

export default MobileSidebarMenu;
