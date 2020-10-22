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
      <img src="/mascots.svg?1" alt="hero" class="mascots-mobile" />
      <div class="copy">
        <div class="text">
          <h2>
            <span class="hardhat">Hardhat</span> is a task runner for Ethereum
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
          <router-link class="action-button" to="/getting-started/"
            >Get Started</router-link
          >
        </div>
      </div>
    </div>

    <div class="home">
      <h3 class="how">How?</h3>

      <Content custom />

      <div class="cta2">
        <router-link class="action-button" to="/getting-started/"
          >Get Started</router-link
        >
      </div>
      <div class="usedby">
        <h3>Who's using Hardhat?</h3>
        <div class="users">
          <div class="logo">
            <img src="/users/kyber-logo.svg" alt="Kyber" />
          </div>
          <div class="logo">
            <img src="/users/synthetix-logo.svg" alt="Synthetix" />
          </div>
          <div class="logo">
            <img src="/users/aave-logo.svg" alt="AAVE" />
          </div>
          <div class="logo">
            <img src="/users/aone-logo.svg" alt="Aragon One" />
          </div>
          <div class="logo">
            <img src="/users/connext-logo.svg" alt="Connext" />
          </div>
          <div class="logo">
            <img src="/users/celer-logo.svg" alt="Celer" />
          </div>
          <div class="logo">
            <img src="/users/decentraland-logo.svg" alt="Decentraland" />
          </div>
          <div class="logo">
            <img src="/users/skale-logo.svg" alt="Skale" />
          </div>
          <div class="logo">
            <img
              src="/users/set-and-tokensets-logo.svg"
              alt="Set + TokenSets"
            />
          </div>
          <div class="logo">
            <img src="/users/pool-together-logo.svg" alt="PoolTogether" />
          </div>
        </div>
      </div>

      <div class="testimonial-slider">
        <component
          v-if="carousel && slide"
          :is="carousel"
          :perPage="1"
          :autoplay="true"
          :autoplayTimeout="5000"
          :navigationEnabled="true"
          :autoplayHoverPause="true"
          navigationNextLabel=""
          navigationPrevLabel=""
        >
          <component
            v-if="carousel && slide"
            :is="slide"
            v-for="(item, index) in pages"
            :key="index"
          >
            <div class="testimonial">
              <div class="testimonial-left">
                <div class="testimonial-img">
                  <img
                    class="author-img"
                    :src="item.authorImg"
                    :alt="item.author"
                  />
                </div>
                <div class="testimonial-data">
                  <span class="author-name">{{ item.author }}</span>
                  <span class="author-role"
                    >{{ item.role }} at {{ item.company }}</span
                  >
                  <img
                    class="author-company"
                    :src="item.companyImg"
                    :alt="item.company"
                  />
                </div>
              </div>
              <div class="testimonial-right">
                <p>
                  <img src="/coma-open.svg" alt="coma-open" />
                  {{ item.text }}
                  <img src="/coma-close.svg" alt="coma-close" />
                </p>
              </div>
            </div>
          </component>
          <div slot="loading">loading...</div>
        </component>
      </div>

      <div class="footer" v-if="data.footer">
        <div class="ef">
          <span>Supported by</span>
          <img
            src="/ethereum-foundation.svg"
            alt="Supported by Ethereum Foundation"
          />
        </div>
        <p>{{ data.footer }}</p>
      </div>

      <router-link to="/guides/truffle-migration.html" class="migrate"
        >Migrate from Truffle now</router-link
      >
    </div>
  </div>
</template>

<script>
import NavLink from "./NavLink.vue";

export default {
  data() {
    return {
      carousel: null,
      slide: null,
      pages: [
        {
          authorImg: "/users/victor.jpg",
          author: "Victor Tran",
          role: "CTO",
          company: "Kyber",
          companyImg: "/users/kyber-logo-testimonial.svg",
          text:
            "Working with Hardhat has been a great experience. Thanks to its flexibility we were able to test across different Solidity versions without duplicating our setup. Kyber has been around for long enough to have legacy contracts deployed with different Solidity versions in our architecture, so this kind of flexibility is important for such a mature project. The collaboration between the Kyber and Hardhat teams to fix issues and implement new features has been fast and smooth, which helped our internal timelines a lot.",
        },
        {
          authorImg: "/users/justin.jpg",
          author: "Justin J. Moses",
          role: "CTO",
          company: "Synthetix",
          companyImg: "/users/synthetix-logo-testimonial.svg",
          text:
            "Tired of battling other testing frameworks, I tried Hardhat on a whim one afternoon to see just how hard it might be to port Synthetix over to it. After fifteen minutes I had one of our specs running nearly 10x faster that what I’d become used to; from that moment I was hooked. Since then, we’ve integrated coverage, supported multiple versions of solc and even set up legacy testing through injection - all without having to wait for features to be added by the Hardhat team. It’s been built using its own extensible task system, dogfooding its own plugin architecture. Fast test turnarounds, extensible architecture and solidity stack traces - my dream of smart contract TDD has become a lot more real!",
        },
        {
          authorImg: "/users/brett.jpg",
          author: "Brett Sun",
          role: "CTO",
          company: "Aragon One",
          companyImg: "/users/aone-logo-testimonial.svg",
          text:
            "Our interest in Hardhat was driven by our own experience of building and maintaining developer tooling for the Aragon ecosystem. Not only were these efforts time consuming, difficult, and error-prone, we also found ourselves constantly re-inventing the wheel in areas we did not want to care about or force opinions on (e.g. Ganache connections, Truffle providers, test strategy). Hardhat, with its plugin ecosystem, has effectively eliminated many of these problems for us. We feel confident piggybacking on the best for the underlying layers so that we can focus our attention on exposing the power of the Aragon ecosystem to our community.",
        },
        {
          authorImg: "/users/rahul.jpg",
          author: "Rahul Sethuram",
          role: "CTO",
          company: "Connext Network",
          companyImg: "/users/connext-logo-testimonial.svg",
          text:
            "Builder has become an essential part of our development and Continuous Integration stack. At Connext, we develop and test complicated smart contract systems for our state channel implementations, making proper Solidity tooling a key to our productivity and success. Hardhat's state-of-the-art Solidity stack trace and console.log features saved us considerable development time. As a user, it's clear that Hardhat prioritizes a great developer experience, which aligns fully with Connext's values. We enjoy interacting with the team and we have even made contributions to the project.",
        },
        {
          authorImg: "/users/esteban.png",
          author: "Esteban Ordano",
          role: "CTO",
          company: "Decentraland",
          companyImg: "/users/decentraland-logo-testimonial.svg",
          text:
            "Hardhat's extensibility, clean interface and excellent design is the most significant advancement in the professionalization of tools for Ethereum of the past year. Our development experience improved significantly, and the quality of the development process is reflected in the fact that our team went from fearing updating packages to the latest version to watching out for the next release.",
        },
      ],
    };
  },
  components: { NavLink },
  computed: {
    data() {
      return this.$page.frontmatter;
    },
    actionLink() {
      return {
        link: this.data.actionLink,
        text: this.data.actionText,
      };
    },
  },
  mounted() {
    import("vue-carousel").then(({ Carousel, Slide }) => {
      this.carousel = Carousel;
      this.slide = Slide;
    });
    const CLASS_NAME = "show-cta";
    const SCROLL_POSITION = 500;

    let __timeout;

    window.addEventListener("scroll", debounce);

    function debounce(event) {
      if (__timeout) {
        clearTimeout(__timeout);
        __timeout = undefined;
      }

      setTimeout(actualCallback, 100);
    }

    function actualCallback(event) {
      var scrollTop =
        window.pageYOffset ||
        (document.documentElement || document.body.parentNode || document.body)
          .scrollTop;
      if (scrollTop >= SCROLL_POSITION) {
        if (!window.document.body.classList.contains(CLASS_NAME)) {
          window.document.body.classList.add(CLASS_NAME);
        }
      } else {
        window.document.body.classList.remove("show-cta");
      }
    }
  },
};
</script>

<style lang="stylus">
@import '../styles/config.styl'

.home
  padding $navbarAndBannerHeight 2rem 0
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
