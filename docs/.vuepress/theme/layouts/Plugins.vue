<template>
  <Layout>
    <template slot="page-top">
      <div class="content">
        <h1>Plugins</h1>
        <p>Plugins are the backbone of Buidler. Buidler's plugins and built-in tasks are built using the same API that you use in your Buidler configuration!</p>
        <p>Extend Buidler's functionality with the plugins below.</p>
        <!-- Check out the [Using Plugins Guide]() to learn more.</p> -->
        <div class="plugins">
          <div class="plugin" v-for="plugin in plugins">
            <div>
              <span class="name">
                <a :href="plugin.url">{{ plugin.name }}</a>
              </span>
              <span class="separator"> | </span>
              <span class="author">
                <a :href="plugin.authorUrl">{{ plugin.author }}</a>
              </span>
              <!-- <span class="version">{{ plugin.version }}</span> -->
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
  components: { Layout },
  data() {
    return {"plugins": require("../../plugins.js")};
  }
};
</script>
