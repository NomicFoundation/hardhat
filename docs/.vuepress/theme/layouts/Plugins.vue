<template>
  <Layout>
    <template slot="page-top">
      <div class="content">
        <h1>Plugins</h1>
        <p>
          Plugins are the backbone of Hardhat, and they're built using the same
          config DSL that you use in your Hardhat configuration. Read the
          <a href="/advanced/building-plugins.html">Building plugins</a> guide
          to learn how to create your own, and
          <a
            href="https://github.com/nomiclabs/hardhat/blob/master/docs/.vuepress/plugins.js"
            >send a pull request</a
          >
          to get it listed here.
        </p>
        <p>Extend Hardhat's functionality with the plugins below.</p>
        <!-- Check out the [Using Plugins Guide]() to learn more.</p> -->
        <div class="plugins">
          <div class="plugin" v-for="plugin in plugins">
            <div>
              <span class="name">
                <a :href="plugin.normalizedName + '.html'">{{ plugin.name }}</a>
              </span>
              <span class="separator"> | </span>
              <span class="author">
                <a :href="plugin.authorUrl">{{ plugin.author }}</a>
              </span>
            </div>
            <p class="description">{{ plugin.description }}</p>
            <div class="tags">
              <div v-for="tag in plugin.tags">{{ tag }}</div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Layout>
</template>

<script>
import Layout from "./Layout.vue";

export default {
  name: "Plugins",
  components: { Layout },
  data() {
    return { plugins: require("../../plugins.js") };
  },
};
</script>
<style lang="stylus">

.plugins

  .plugin
    min-height 97px
    padding 45px 0 15px
    border-bottom 1px solid rgba(44, 62, 79, 0.15)

    .name a
      font-size 1.2em
      font-weight bold
      text-decoration none !important

    .separator
      padding 0 8px
      color $lightGrey
      @media (max-width: $MQMobile)
        display: none

    .author a
      font-size 1em
      color $lightGrey

      &:hover
        color $darkYellow
      @media (max-width: $MQMobile)
        display block
        padding-top 8px

    .description
      margin: 6px 0 12px

    .tags div
      background-color #F3F4F4
      border-radius 6px
      display inline-flex
      padding 6px 16px
      font-size 0.80em
      margin 0 8px 15px 0
</style>
