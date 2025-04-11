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
import { media, tm, tmDark, tmSelectors } from "../themes";
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
  height: 100%;
`;

const MobileNavigationContainer = styled.ul`
  list-style-type: none;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 40px 32px;
  color: ${tm(({ colors }) => colors.neutral900)};
  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral900)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.neutral900)};
    }
  }
  ${media.tablet} {
    padding: 40px 44px;
  }
`;

const MenuItem = styled.li`
  display: flex;
  align-items: center;
  font-size: 20px;
  font-weight: 400;
  font-family: SourceCodePro, sans-serif;
  cursor: pointer;

  &:hover {
    color: ${tm(({ colors }) => colors.accent700)};
    & svg {
      fill: ${tm(({ colors }) => colors.accent700)};
    }

    ${tmSelectors.dark} {
      color: ${tmDark(({ colors }) => colors.accent700)};
      & svg {
        fill: ${tmDark(({ colors }) => colors.accent700)};
      }
    }
    ${media.mqDark} {
      ${tmSelectors.auto} {
        color: ${tmDark(({ colors }) => colors.accent700)};
        & svg {
          fill: ${tmDark(({ colors }) => colors.accent700)};
        }
      }
    }
  }
  & > a {
    position: relative;
    padding: 2px 8px;
    border-radius: 3px;
    text-transform: lowercase;
  }

  &[data-current="true"] > a {
    background-color: ${tm(({ colors }) => colors.gray6)};
    color: ${tm(({ colors }) => colors.gray1)};
  }

  ${tmSelectors.dark} {
    &[data-current="true"] > a {
      background-color: ${tmDark(({ colors }) => colors.gray6)};
      color: ${tmDark(({ colors }) => colors.neutral200)};
    }
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      &[data-current="true"] > a {
        background-color: ${tmDark(({ colors }) => colors.gray6)};
        color: ${tmDark(({ colors }) => colors.neutral200)};
      }
    }
  }

  & svg {
    margin-left: 4px;

    fill: ${tm(({ colors }) => colors.gray7)};

    ${tmSelectors.dark} {
      fill: ${tmDark(({ colors }) => colors.gray2)};
    }
    ${media.mqDark} {
      ${tmSelectors.auto} {
        fill: ${tmDark(({ colors }) => colors.gray2)};
      }
    }
  }
`;

const MobileMenuFooter = styled.div<{ isRelative?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 16px 40px;
  position: relative;
  bottom: 0;
  margin-top: auto;
`;

const ModalContainer = styled.div<{ isModalOpen: boolean }>`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  position: absolute;
  width: 100%;
  top: 0px;
  transition: all ease-out 0.25s;
  font-family: Roboto, sans-serif;
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

const ModalHeader = styled.div`
  padding: 32px 32px 16px;
`;

const ModalBackToMenuButton = styled.button`
  display: flex;
  align-items: center;
  font-size: 14px;
  font-family: Roboto, sans-serif;
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
    width: 16px;
    height: 16px;
    margin-right: 8px;

    fill: ${tm(({ colors }) => colors.backButton)};
  }
  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.backButton)};
    & svg {
      fill: ${tmDark(({ colors }) => colors.backButton)};
    }
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.backButton)};
      & svg {
        fill: ${tmDark(({ colors }) => colors.backButton)};
      }
    }
  }
`;

const ModalTitle = styled.h4`
  margin: 6px 0 0;
  font-size: 20px;
  font-weight: 400;
  width: fit-content;
  font-family: SourceCodePro, sans-serif;
  text-transform: lowercase;
  line-height: 33px;
  letter-spacing: 0.05em;
  white-space: nowrap;
  padding: 0 8px;
  border-radius: 3px;
  position: relative;
  background-color: ${tm(({ colors }) => colors.gray6)};
  color: ${tm(({ colors }) => colors.gray1)};

  ${tmSelectors.dark} {
    background-color: ${tmDark(({ colors }) => colors.gray6)};
    color: ${tmDark(({ colors }) => colors.neutral200)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-color: ${tmDark(({ colors }) => colors.gray6)};
      color: ${tmDark(({ colors }) => colors.neutral200)};
    }
  }
`;

const ToolsList = styled.ul`
  display: flex;
  flex-direction: column;
  user-select: none;
  list-style-type: none;
  font-size: 16px;
  line-height: 150%;
  font-weight: 500;
  ont-family: SourceCodePro, sans-serif;
  padding: 16px 32px;
  gap: 16px;
`;

const ToolsListItem = styled.li`
  a {
    padding: 2px 8px;
    border-radius: 3px;
    color: ${tm(({ colors }) => colors.gray7)};

    ${tmSelectors.dark} {
      color: ${tmDark(({ colors }) => colors.gray7)};
    }
    ${media.mqDark} {
      ${tmSelectors.auto} {
        color: ${tmDark(({ colors }) => colors.gray7)};
      }
    }
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
      <ModalHeader>
        <ModalBackToMenuButton onClick={() => setModalState(null)}>
          <MobileMenuArrowBack />
          Menu
        </ModalBackToMenuButton>
        <ModalTitle>{modalState?.label}</ModalTitle>
      </ModalHeader>
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
