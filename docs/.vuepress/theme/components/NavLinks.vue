<template>
  <nav class="nav-links" v-if="userLinks.length || repoLink">
    <!-- user links -->
    <div class="nav-item" v-for="item in userLinks" :key="item.link">
      <DropdownLink v-if="item.type === 'links'" :item="item" />
      <NavLink v-else :item="item" />
    </div>

    <!-- repo link -->
    <a
      v-if="repoLink && github"
      :href="repoLink"
      class="repo-link"
      target="_blank"
      rel="noopener noreferrer"
    >
      {{ repoLabel }}
      <OutboundLink />
    </a>
  </nav>
</template>

<script>
import DropdownLink from "./DropdownLink.vue";
import { resolveNavLinkItem } from "../util";
import NavLink from "./NavLink.vue";

export default {
  components: { NavLink, DropdownLink },
  props: ["github"],

  computed: {
    userNav() {
      return this.$themeLocaleConfig.nav || this.$site.themeConfig.nav || [];
    },

    nav() {
      const { locales } = this.$site;
      if (locales && Object.keys(locales).length > 1) {
        const currentLink = this.$page.path;
        const routes = this.$router.options.routes;
        const themeLocales = this.$site.themeConfig.locales || {};
        const languageDropdown = {
          text: this.$themeLocaleConfig.selectText || "Languages",
          items: Object.keys(locales).map((path) => {
            const locale = locales[path];
            const text =
              (themeLocales[path] && themeLocales[path].label) || locale.lang;
            let link;
            // Stay on the current page
            if (locale.lang === this.$lang) {
              link = currentLink;
            } else {
              // Try to stay on the same page
              link = currentLink.replace(this.$localeConfig.path, path);
              // fallback to homepage
              if (!routes.some((route) => route.path === link)) {
                link = path;
              }
            }
            return { text, link };
          }),
        };
        return [...this.userNav, languageDropdown];
      }
      return this.userNav;
    },

    userLinks() {
      return (this.nav || []).map((link) => {
        return Object.assign(resolveNavLinkItem(link), {
          items: (link.items || []).map(resolveNavLinkItem),
        });
      });
    },

    repoLink() {
      const { repo } = this.$site.themeConfig;
      if (repo) {
        return /^https?:/.test(repo) ? repo : `https://github.com/${repo}`;
      }
    },

    repoLabel() {
      if (!this.repoLink) return;
      if (this.$site.themeConfig.repoLabel) {
        return this.$site.themeConfig.repoLabel;
      }

      const repoHost = this.repoLink.match(/^https?:\/\/[^/]+/)[0];
      const platforms = ["GitHub", "GitLab", "Bitbucket"];
      for (let i = 0; i < platforms.length; i++) {
        const platform = platforms[i];
        if (new RegExp(platform, "i").test(repoHost)) {
          return platform;
        }
      }

      return "Source";
    },
  },
};
</script>

<style lang="stylus">
@import '../styles/config.styl'
@import '../styles/util/variables.styl'


.nav-links

  a


    @media (min-width: $MQMobile)

      color $black !important
      position relative
      text-transform uppercase
      font-family 'Chivo'
      letter-spacing 0.1rem
      font-size 15px
      -webkit-font-smoothing antialiased
      -moz-osx-font-smoothing grayscale

      display inline-block

      line-height 1.4rem

      text-decoration none !important
      border: 0 !important

      &:hover, &.router-link-active
        color $black !important

      &:after
        content ''
        position absolute
        height 1px
        width 0%
        background $black
        left 0
        bottom -0.5rem
        transition 0.2s ease-in-out all

      &.highlighted,
      &:hover
        &:after
          width 100%

    @media (min-width: $MQNarrow)
      margin-right 20px


  .nav-item
    position relative
    display inline-block
    margin-left 1.5rem
    line-height 2rem

    &:first-child
      margin-left 0

  .repo-link
    margin-left 1.5rem

@media (max-width: $MQMobileNarrow)
  .nav-item > a
    color $black

  .nav-item > a:not(.external)

    &:hover, &.router-link-active
      color: $accentColor !important
      border-bottom 2px solid $accentColor

@media (max-width: $MQMobile)
  .nav-links
    .nav-item, .repo-link
      margin-left 0

@media (min-width: $MQMobile)
  .nav-links a
    &:hover, &.router-link-active
      color $textColor

  .nav-item > a:not(.external)
    &:hover, &.router-link-active
      margin-bottom -2px
</style>
