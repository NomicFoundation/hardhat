<template lang="pug">
  mixin nav(classes)
    nav(class=classes)
      ul.nav-links
        li
          router-link(to="/" active-class="highlighted" exact) Home
        li(v-for="navLink of navLinks.slice(1)")
          div(:id="navLink.text")
            a(
              v-if="navLink.text == 'Tools'"
              @click="toggleToolDropdown" 
              :class="isToolDropdownOpen ? 'dropdown-open' : ''") {{navLink.text}}
            a(
              v-else
            ) {{navLink.text}}
            #tools-dropdown-wrapper(v-if="navLink.text == 'Tools'")
                .tools-dropdown
                  div.tools-item-wrapper(v-for="tool of tools")
                    .tools-item(:id="tool")
                        .dropdown-tool-image
                        .dropdown-tool-title
                            span.hardhat Hardhat
                            span.name {{tool.charAt(0).toUpperCase() + tool.slice(1)}}
      ul.social-links
        li(v-for="socialLink of social")
          a(
            :href="socialLink.link" 
            :title="socialLink.name" 
            target="_blank" 
            rel="noopener noreferrer"
          )
            img(:src="socialLink.img")

  section.navbar
  
    .navbar-inner-container.padded-container
      router-link(to="/")
        .logo
      +nav('desktop-nav mb-hidden')
      div.mb-show.mb-menu-toggler
        div#nav-icon3
          div
          div
          div
      .navbar-mobile-wrapper.hidden
        .navbar-mobile.hidden
          +nav('')
</template>

<script>
import GithubLogo from "../img/assets/social/github.svg";
import TwitterLogo from "../img/assets/social/twitter.svg";
import DiscordLogo from "../img/assets/social/discord.svg";

export default {
  name: "HHNavbar",
  data() {
    return {
      isToolDropdownOpen: false,
    } 
  },
  methods: {
    toggleToolDropdown() {
      this.isToolDropdownOpen = !this.isToolDropdownOpen
    }
  },
  computed: {
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
    navLinks() {
      return this.$site.themeConfig.nav;
    },
    tools() {
      return ['runner','ignition','network','solidity']
    }
  },
  mounted() {
    const menuToggler = this.$el.querySelector("#nav-icon3");
    const mobileMenuContainer = this.$el.querySelector(".navbar-mobile");
    const mobileMenuWrapper = this.$el.querySelector(".navbar-mobile-wrapper");

    menuToggler.addEventListener("click", (e) => {
      if (mobileMenuContainer.classList.contains("hidden")) {
        mobileMenuWrapper.style.pointerEvents = "all";
        mobileMenuWrapper.style.background = "white";
        mobileMenuContainer.classList.remove("hidden");
        mobileMenuWrapper.classList.remove("hidden");
        menuToggler.classList.add("open");
        document.querySelector("html").style.overflowY = "hidden";
      } else {
        menuToggler.classList.remove("open");
        mobileMenuWrapper.style.pointerEvents = "none";
        mobileMenuWrapper.style.background = "none";
        mobileMenuContainer.classList.add("hidden");
        mobileMenuWrapper.classList.add("hidden");
        document.querySelector("html").style.overflowY = "auto";
      }
    });
  },
};
</script>

<style lang="stylus" scoped>
@import "../styles/util/variables.styl"

.navbar
  -webkit-font-smoothing antialiased
  -moz-osx-font-smoothing grayscale
  background transparent !important
  position relative
  z-index 1
  height unset
  color $black !important
  @media (max-width: 1000px)
    padding 15px 24px
    padding-top 0px
    height 80px !important
    margin-bottom 0

  .navbar-inner-container
    display flex

    justify-content space-between

    margin 0 auto
    @media (max-width: 1000px)
      padding 1rem 0

    .logo
      background-image url('../img/hardhat_logos/Hardhat-logo.svg')
      background-position top left
      height 40px
      width 200px
      background-repeat no-repeat
      position relative
      top 0.4rem
      margin-left 0 !important
      left -24px
      @media (max-width: 1000px)
        height 40px
        left 0
      @media (max-width: 1000px) and (min-width: 720px)
        left calc(-128px + 56px)

    nav
      width 100%
      display flex


      ul.nav-links
        margin-left auto
        display flex
        list-style none
        justify-content space-between
        background transparent !important

        li
          line-height 3rem


          a
            position relative
            text-transform uppercase
            font-family 'Chivo'
            letter-spacing 0.1rem
            color #0A0A0A
            font-size 15px
            margin-left 40px !important
            margin-right 0px !important

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

      ul.social-links
        margin-left 44px
        list-style none
        display flex
        align-items center
        justify-content unset 
        @media screen and (max-width: 1000px)
          width 150px
          justify-content space-evenly
          li
            margin-right 0
        li
          margin-right 15px
          &:last-child
            margin-right 0
        li
          transition 0.2s ease-in-out opacity
          display inline-block
          
          a
            display inline-block
            padding-top 3px
            
            img
              height 18px
              display inline-block

          &:hover
            opacity 0.5

    .mb-menu-toggler
      display flex
      flex-direction column
      justify-content center
      cursor pointer
      position relative
      width 48px
      height 48px
      #nav-icon3
        // width inherit
        // height inherit
      @media (max-width: 1000px) and (min-width: 720px)
        left calc(142px - 56px)

    .navbar-mobile-wrapper
      overflow auto
      position absolute
      width 100vw
      height calc(100vh - 80px - 40px)
      left 0
      top 80px
      pointer-events none
      overflow hidden
      .navbar-mobile.hidden
        nav
          left 20px !important
          opacity 0

      .navbar-mobile
        height 100%
        background white
        position absolute
        top 0
        left 0
        z-index 1
        opacity 1
        width 100vw
        transition .5s ease-in-out left
        background white
        overflow-y scroll
        @media screen and (max-height: 400px)
          nav
            li
              line-height 16px

              a
                font-size 16px !important
                margin-bottom 8px


          .social-links
            img
              width 20px !important
              height 20px !important
        @media screen and (max-width: 1000px)
          nav
            display flex !important
            flex-direction column
            justify-content space-evenly
            position relative
            transition 1s ease-in-out all
            left 0px
            opacity 1

            li
              margin 0 !important
              padding 0 !important

              a
                margin-left 0
                margin-bottom 20px
                display block
                font-size 28px
                position relative

            .nav-links
              margin 0
              text-align center
              position relative
              // top -20px

            .social-links
              margin 0
              flex-direction row
              width 100%
              padding 0 70px
              margin-top 40px
              img
                width 30px
                height 30px

        nav
          max-width unset
          display block
          padding 20px
          padding-top 64px
          ul
            display flex
            flex-direction column

            li
              display block
              margin-bottom 10px
              padding-left 60px

              a
                font-size 24px
                margin-left 0px !important

                &:after
                  display none

#nav-icon3
  top: 4px;
  width: 28px;
  height: 28px;
  position: relative;
  margin: 0 auto;
  -webkit-transform: rotate(0deg);
  -moz-transform: rotate(0deg);
  -o-transform: rotate(0deg);
  transform: rotate(0deg);
  -webkit-transition: .5s ease-in-out;
  -moz-transition: .5s ease-in-out;
  -o-transition: .5s ease-in-out;
  transition: .5s ease-in-out;
  cursor: pointer;


#nav-icon3 div
  display: block;
  position: absolute;
  height: 2px;
  width: 100%;
  background: #0a0a0a;
  opacity: 1;
  left: 0;
  -webkit-transform: rotate(0deg);
  -moz-transform: rotate(0deg);
  -o-transform: rotate(0deg);
  transform: rotate(0deg);
  -webkit-transition: .25s ease-in-out all;
  -moz-transition: .25s ease-in-out all;
  -o-transition: .25s ease-in-out all;
  transition: .25s ease-in-out all;


#nav-icon3 div:nth-child(1)
  top: 0px;


#nav-icon3 div:nth-child(2)
  width: 70%;


#nav-icon3 div:nth-child(2)
  top: 8px;


#nav-icon3 div:nth-child(3)
  top: 16px;


#nav-icon3.open div:nth-child(2)
  opacity: 0;


#nav-icon3.open div:nth-child(1)
  transform: rotate(45deg);
  width: 100%;
  top: 8px;


#nav-icon3.open div:nth-child(3)
  transform: rotate(-45deg);
  width: 100%;
  top: 8px;

.navbar-mobile
  #Tools
    a
      margin-bottom 20px
      transition ease-in-out 0.2s all
      &.dropdown-open
        margin-bottom 0
        & + #tools-dropdown-wrapper
          max-height 200px
          margin-bottom 20px
          opacity 1
    #tools-dropdown-wrapper
      max-height 0
      overflow hidden
      margin-bottom 0px
      transition ease-in-out 0.2s all
      opacity 0
      .dropdown-tool-title
        line-height 40px
        span
          font-size 15px
          font-family 'Chivo'
          &.hardhat
            color #6E6F70
            margin-right 8px

.desktop-nav
  #Tools
    position relative
    a:hover + #tools-dropdown-wrapper,
    & #tools-dropdown-wrapper:hover
      pointer-events all !important
      top 0
      opacity 1
      filter drop-shadow(0px 6px 50px rgba(0,0,0,0.1)) blur(0px)
      transform scale(1)
      z-index 100
    a
      position relative
      z-index 1
      &:hover 
        &:after
          display none
    #tools-dropdown-wrapper
      position absolute
      z-index 0
      top 10px
      left -170px
      width 492px
      height 200px
      opacity 0
      pointer-events none
      transition ease-in-out 0.2s all
      filter drop-shadow(0px 6px 50px rgba(0,0,0,0.1)) blur(5px)
      .tools-dropdown
        position relative
        top 56px
        width inherit
        height 168px
        padding 24px 48px
        border-radius 4px
        background white
        flex-wrap wrap
        justify-content space-between
        display flex
        .tools-item-wrapper
          display flex
          align-items center
        &:before
          content ''
          position absolute
          width 12px
          height 12px
          background white
          left calc(50% - 15px)
          top -6px
          transform rotate(45deg)
        .tools-item
          display flex
          align-items center
          cursor pointer
          &:hover
            .dropdown-tool-title
              &:after
                width 100%
          .dropdown-tool-image
            transition inherit
            width 42px
            height 42px
            background-size 42px
            background-position center
            background-repeat no-repeat
            border-radius 8px
            margin-right 8px
          &#runner .dropdown-tool-image
            background-image url(../img/tool_icons/Hardhat-Runner.svg)
          &#network .dropdown-tool-image
              background-image url(../img/tool_icons/Hardhat-Network.svg)
          &#ignition .dropdown-tool-image
              background-image url(../img/tool_icons/Hardhat-Ignition.svg)
          &#solidity .dropdown-tool-image
              background-image url(../img/tool_icons/Hardhat-Solidity.svg)
          .dropdown-tool-title 
            position relative
            &:after
              position absolute
              content ''
              bottom 8px
              left 0
              width 0
              height 1px 
              background #6E6F70
              transition ease-in-out 0.3s width
            span
              font-family 'Chivo'
              font-size 15px
              font-weight 500
              &.hardhat
                color #6E6F70
                margin-right 4px

</style>
