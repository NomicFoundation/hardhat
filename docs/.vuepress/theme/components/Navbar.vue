<template>
  <div
    class="navbar"
    v-bind:class="{ notFixed: $page.frontmatter.home === true }"
  >
    <div style="position: relative;">
      <HHTopBar />
      <div style="position: relative;" class="navigation-bar">
        <header>
          <SidebarButton @toggle-sidebar="$emit('toggle-sidebar')" />

          <a href="/" class="home-link">
            <div class="logo"></div>
            <span
              ref="siteName"
              class="site-name"
              v-if="$siteTitle"
              :class="{ 'can-hide': $site.themeConfig.logo }"
              >{{ $siteTitle }}</span
            >
          </a>

          <div
            class="links"
            :style="{
              'max-width': linksWrapMaxWidth + 'px',
            }"
          >
            <AlgoliaSearchBox v-if="isAlgoliaSearch" :options="algolia" />
            <SearchBox v-else-if="$page.frontmatter.search !== false" />
            <NavLinks class="can-hide" />

            <ul class="social-links social-links-non-landing">
              <li v-for="socialLink of social" v-bind:key="socialLink.link">
                <a
                  :href="socialLink.link"
                  :title="socialLink.name"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img :src="socialLink.img" />
                </a>
              </li>
            </ul>
            <div class="dark-mode-toggle" v-on:click="toggleDarkTheme">
              <div class="dark-mode-icon" />
            </div>
          </div>
        </header>
      </div>
    </div>
  </div>
</template>

<script>
  import SidebarButton from "./SidebarButton.vue";
  import AlgoliaSearchBox from "./AlgoliaSearchBox.vue";
  import SearchBox from "./SearchBox.vue";
  import NavLinks from "./NavLinks.vue";
  import HHTopBar from "./HHTopBar";

  import LogoImg from "../img/hardhat_logos/Hardhat-logo.svg";
  import GithubLogo from "../img/assets/social/github.svg";
  import TwitterLogo from "../img/assets/social/twitter.svg";
  import DiscordLogo from "../img/assets/social/discord.svg";

  import DMLight from "../img/icons/dm_light.svg";

  export default {
    components: {
      HHTopBar,
      SidebarButton,
      NavLinks,
      SearchBox,
      AlgoliaSearchBox,
    },

  data() {
    return {
      linksWrapMaxWidth: null,
      logoImg: LogoImg,
      DMLight: DMLight,
      themeClasses: ['light-mode', 'dark-mode', 'hc-dark-mode'],
      currentTheme: 0
    };
  },

  mounted() {
    const body = document.body;
    this.currentThemeClass = this.themeClasses[0];
    body.classList.add(this.themeClasses[this.currentTheme]);

    const MOBILE_DESKTOP_BREAKPOINT = 719; // refer to config.styl
    const NAVBAR_VERTICAL_PADDING =
      parseInt(css(this.$el, "paddingLeft")) +
      parseInt(css(this.$el, "paddingRight"));
    const handleLinksWrapWidth = () => {
      if (document.documentElement.clientWidth < MOBILE_DESKTOP_BREAKPOINT) {
        this.linksWrapMaxWidth = null;
      } else {
        this.linksWrapMaxWidth =
          this.$el.offsetWidth -
          NAVBAR_VERTICAL_PADDING -
          ((this.$refs.siteName && this.$refs.siteName.offsetWidth) || 0);
      }
    };
    handleLinksWrapWidth();
    window.addEventListener("resize", handleLinksWrapWidth, false);
  },
  methods: {
    nextTheme() {
      const body = document.body;
      if (this.themeClasses.length - 1 == this.currentTheme) {
        this.currentTheme = 0;
      } else {
        this.currentTheme += 1;
      };

      body.className="";
      console.log(this.themeClasses[this.currentTheme])
      body.classList.add(this.themeClasses[this.currentTheme]);

    },
    toggleDarkTheme() {
      this.nextTheme();
    },
    checkUserPreference() {
        //Check Storage on Page load. Keep user preference through sessions
        if (localStorage.getItem("dark-theme")) {
            document.body.classList.add("dark-mode");
            document.getElementById('theme-toggle').checked = true;
        }
    }
  },
  computed: {
    algolia() {
      return (
        this.$themeLocaleConfig.algolia || this.$site.themeConfig.algolia || {}
      );
    },

    isAlgoliaSearch() {
      return this.algolia && this.algolia.apiKey && this.algolia.indexName;
    },

    social() {
      const { repo } = this.$site.themeConfig;
      return [
        {
          name: "Github",
          link: `https://github.com/${repo}`,
          img: GithubLogo,
        },
        {
          name: "Twitter",
          link: "https://twitter.com/HardhatHQ",
          img: TwitterLogo,
        },
        {
          name: "Discord",
          link: "https://hardhat.org/discord",
          img: DiscordLogo,
        },
      ];
    },
  },
};

function css(el, property) {
  // NOTE: Known bug, will return 'auto' if style value is 'auto'
  const win = el.ownerDocument.defaultView;
  // null means not to return pseudo styles
  return win.getComputedStyle(el, null)[property];
}
</script>

<style lang="stylus">
@import '../styles/config.styl'

$navbar-vertical-padding = 0.5rem
$navbar-horizontal-padding = 2rem

.navbar
  .logo
    width: 164px;
    height: 41px;
    background-position: center left;
    background-size: contain;
  .router-link-active:after
    width: 100%;
  .dark-mode-toggle
    display: flex;
    cursor: pointer;
    margin-left: auto;
    @media (max-width: 1390px)
      margin-left: 8px;
    .dark-mode-icon {
      width: 32px;
      height: 32px;
      background-image: url('../../theme/img/icons/dm_light.svg');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      position: relative;
      top: 16px;
      @media (max-width: $MQMobile) {
        top: 0;
      }
    }
  .social-links
    list-style none
    justify-content space-evenly
    display flex
    align-items center
    width 116px
    padding-left 0px
    margin-right 2rem
    position: relative;
    top: 2px;
    li
      transition 0.2s ease-in-out opacity

      &:hover
        opacity 0.5

      a
        display inline-block

      img
        height 18px

  .header
    padding $navbar-vertical-padding $navbar-horizontal-padding 1.5rem $navbar-horizontal-padding

  line-height $navbarHeight - 1.4rem
  position relative
  a, span, img
    display inline-block
  .logo
    position absolute
    top 1.2rem
    left 0rem

    height 40px
    min-width $navbarHeight - 1.4rem
    margin-left $navbar-horizontal-padding
    vertical-align top
  .site-name
    font-size 1.3rem
    font-weight 600
    color $textColor
    position relative
  .links
    padding-left 1.5rem
    box-sizing border-box
    background-color white
    white-space nowrap
    font-size 1rem
    right $navbar-horizontal-padding
    top 0.6rem
    display flex
    margin-left: auto;
    padding: 0 20px 0 0;
    min-width: 1020px;
    @media (max-width: 1390px)
        min-width: unset;
    .search-box
      flex: 0 0 auto
      vertical-align top

      @media (min-width: $MQNarrow)
        margin-right 40px

@media (max-width: 1240px)
  .navbar
    .social-links-non-landing
      display none !important

@media (max-width: $MQMobile)
  .navbar
    .logo
      margin-left 4rem
    .can-hide
      display none
    .links
      padding-left 1.5rem
</style>
