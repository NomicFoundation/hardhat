<template>
  <div>
    <div>
      <div class="dark">
        <h1>Turn a mess of tricky Solidity tools into a smooth workflow</h1>
        <p>
          Unlock your productivity through flexibility, interoperability, and
          standardization.
        </p>
      </div>
    </div>

    <div class="hero">
      <img src="/mascots.svg" alt="hero" class="mascots-mobile" />
      <div class="copy">
        <div class="text">
          <h2>
            <span class="buidler">Buidler</span> is a task runner for Ethereum
            smart contract developers.
          </h2>
          <p>
            It works with all developer tools, rather than replace any specific
            ones. It's value comes from being the connective tissue, rather than
            from specific functionality. It's an integration platform for other
            tools to build upon.
          </p>
        </div>
        <img src="/mascots.svg" alt="hero" class="mascots" />
        <div class="cta cta1">
            <a
              href="/guides/"
              rel="noopener noreferrer"
              class="action-button nav-link"
            >
              Get Started
            </a>
        </div>
      </div>
    </div>

    <div class="home">

      <h3 class="how">How?</h3>

      <Content custom />

      <div class="cta2">
          <a
            href="/guides/"
            rel="noopener noreferrer"
            class="action-button"
          >
            Get Started
          </a>
      </div>

      <p
        style="text-align: center;font-style: italic;margin-top: 100px;color: rgb(189, 189, 189);"
      >
        Some of the plugins shown above are currently under development.
      </p>

      <div class="usedby">
        <h3>Used By</h3>
        <div class="users">
          <div class="logo">
            <a href="https://github.com/decentraland/gate"
              ><img src="/decentraland.svg" alt="decentraland"
            /></a>
          </div>
          <div class="logo">
            <a href=""><img src="/spankchain.svg" alt="spankchain"/></a>
          </div>
        </div>
      </div>

      <div class="footer" v-if="data.footer">
        {{ data.footer }}
      </div>
    </div>
  </div>
</template>

<script>
import NavLink from "./NavLink.vue";

export default {
  components: { NavLink },

  computed: {
    data() {
      return this.$page.frontmatter;
    },

    actionLink() {
      return {
        link: this.data.actionLink,
        text: this.data.actionText
      };
    }
  }
};
</script>

<style lang="stylus">
@import './styles/config.styl'

.home
  padding $navbarHeight 2rem 0
  max-width 960px
  margin 0px auto
  .hero
    text-align center
    img
      max-height 280px
      display block
      margin 3rem auto 1.5rem
    h1
      font-size 3rem
    h1, .description, .action
      margin 1.8rem auto
    .description
      max-width 35rem
      font-size 1.6rem
      line-height 1.3
      color lighten($textColor, 40%)
    .action-button
      display inline-block
      font-size 1.2rem
      color #fff
      background-color $accentColor
      padding 0.8rem 1.6rem
      border-radius 4px
      transition background-color .1s ease
      box-sizing border-box
      border-bottom 1px solid darken($accentColor, 10%)
      &:hover
        background-color lighten($accentColor, 10%)
  .footer
    padding 2.5rem
    text-align center
    color lighten($textColor, 25%)

@media (max-width: $MQMobile)
  .home
    .features
      flex-direction column
    .feature
      max-width 100%
      padding 0 2.5rem

@media (max-width: $MQMobileNarrow)
  .home
    padding-left 1.5rem
    padding-right 1.5rem
    .hero
      img
        max-height 210px
        margin 2rem auto 1.2rem
      h1
        font-size 2rem
        
      h1, .description, .action
        margin 1.2rem auto
        
      .description
        font-size 1.2rem
        
      .action-button
        font-size 1rem
        padding 0.6rem 1.2rem
        
    .feature
      h2
        font-size 1.25rem
</style>
