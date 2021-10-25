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

        <div class="plugins">
          <div class="plugins-list-title">
            <h2>Official plugins</h2>
          </div>

          <div class="plugin" v-for="plugin in plugins.officialPlugins">
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

        <div id="community-plugins"></div>
        <div class="plugins">
          <div class="plugins-list-title">
            <h2>Community plugins</h2>
            <span>Sorted by npm downloads</span>
          </div>

          <div class="plugin" v-for="plugin in plugins.communityPlugins">
            <div>
              <span class="name">
                <a :href="'https://www.npmjs.com/package/' + (plugin.npmPackage || plugin.name)">{{ plugin.name }}</a>
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
    return { plugins: require("../../sorted-plugins.js") };
  }
};
</script>
<style lang="stylus" scoped>
@import "../styles/colors.styl";

#community-plugins
  margin-bottom 50px

.plugins
  margin-top 25px

  .plugins-list-title
    h2
      border-bottom none
      display inline-block
      margin-bottom 0
      padding-right 0.5rem

    span
      display inline-block
      color $lightGrey
    margin-bottom 2rem

  .plugin
    min-height 97px
    padding 0 0 35px

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
