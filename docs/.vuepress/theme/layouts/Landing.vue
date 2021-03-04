<template lang="pug">
div
  .theme-container.landing-html(
    :class="pageClasses",
    @touchstart="onTouchStart",
    @touchend="onTouchEnd"
  )
    #topRow(:class="{ navBarAndBannerSticky }")
      HHTopBar(v-if="shouldShowNavbar")
      HHNavbar(v-if="shouldShowNavbar", @toggle-sidebar="toggleSidebar")
  
    HHHero(v-if="this.$page.frontmatter.home")
  
    .sidebar-mask(@click="toggleSidebar(false)")
  
    HHSidebar(:items="sidebarItems", @toggle-sidebar="toggleSidebar")
      slot(name="sidebar-top", slot="top")
      slot(name="sidebar-bottom", slot="bottom")
  
    main
      HHHome(v-if="this.$page.frontmatter.home")
  
      HHPage(v-else, :sidebar-items="sidebarItems")
        slot(name="page-top", slot="top")
        slot(name="page-bottom", slot="bottom")
  
    HHFooter(v-if="this.$page.frontmatter.home")
</template>

<script>
import Vue from "vue";
import nprogress from "nprogress";
import HHNavbar from "../components/HHNavbar";
import HHTopBar from "../components/HHTopBar";
import HHHero from "../components/HHHero";
import { resolveSidebarItems } from "../util";
import HHFooter from "../components/HHFooter";
import HHHome from "../components/HHHome";
import HHPage from "../components/HHPage";
import HHSidebar from "../components/HHSidebar";

export default {
  name: "Layout",
  components: {
    HHTopBar,
    HHNavbar,
    HHHero,
    HHHome,
    HHFooter,
    HHPage,
    HHSidebar,
  },

  data() {
    return {
      isSidebarOpen: false,
    };
  },

  computed: {
    navBarAndBannerSticky() {
      return this.$page.frontmatter.home !== true;
    },
    shouldShowNavbar() {
      const { themeConfig } = this.$site;
      const { frontmatter } = this.$page;
      if (frontmatter.navbar === false || themeConfig.navbar === false) {
        return false;
      }

      return (
        this.$title ||
        themeConfig.logo ||
        themeConfig.repo ||
        themeConfig.nav ||
        this.$themeLocaleConfig.nav
      );
    },

    shouldShowSidebar() {
      const { frontmatter } = this.$page;
      return (
        !frontmatter.layout &&
        !frontmatter.home &&
        frontmatter.sidebar !== false &&
        this.sidebarItems.length
      );
    },

    sidebarItems() {
      return resolveSidebarItems(
        this.$page,
        this.$route,
        this.$site,
        this.$localePath
      );
    },

    pageClasses() {
      const userPageClass = this.$page.frontmatter.pageClass;
      return [
        {
          "no-navbar": !this.shouldShowNavbar,
          "sidebar-open": this.isSidebarOpen,
          "no-sidebar": !this.shouldShowSidebar,
        },
        userPageClass,
      ];
    },
  },

  mounted() {
    // configure progress bar
    nprogress.configure({ showSpinner: false });

    this.$router.beforeEach((to, from, next) => {
      if (to.path !== from.path && !Vue.component(to.name)) {
        nprogress.start();
      }
      next();
    });

    this.$router.afterEach(() => {
      nprogress.done();
      this.isSidebarOpen = false;
    });
  },

  created() {
    if (typeof window !== "undefined") {
      window.document.children[0].classList.add("landing-html");
    }
  },

  destroyed() {
    if (typeof window !== "undefined") {
      window.document.children[0].classList.remove("landing-html");
    }
  },

  methods: {
    toggleSidebar(to) {
      this.isSidebarOpen = typeof to === "boolean" ? to : !this.isSidebarOpen;
    },

    // side swipe
    onTouchStart(e) {
      this.touchStart = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY,
      };
    },

    onTouchEnd(e) {
      const dx = e.changedTouches[0].clientX - this.touchStart.x;
      const dy = e.changedTouches[0].clientY - this.touchStart.y;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
        if (dx > 0 && this.touchStart.x <= 80) {
          this.toggleSidebar(true);
        } else {
          this.toggleSidebar(false);
        }
      }
    },
  },
};
</script>

<style src="prismjs/themes/prism-tomorrow.css"></style>
<style lang="stylus" src="../styles/theme.styl"></style>
<style lang="stylus" scoped></style>
