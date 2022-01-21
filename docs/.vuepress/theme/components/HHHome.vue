<template lang="pug">
div
  main
    HHTools
    HHWhyHardhat
    HHStartBuilding
    HHWhosUsingHardhat
    HHTestimonials
    HHBuiltBy
</template>

<script>
import HHTools from "./HHTools";
import HHWhyHardhat from "./HHWhyHardhat";
import HHStartBuilding from "./HHStartBuilding";
import HHWhosUsingHardhat from "./HHWhosUsingHardhat";
import HHTestimonials from "./HHTestimonials";
import HHBuiltBy from "./HHBuiltBy";

export default {
  name: "HHHome",
  components: {
    HHWhyHardhat,
    HHStartBuilding,
    HHWhosUsingHardhat,
    HHTestimonials,
    HHBuiltBy,
    HHTools
  },
};
</script>

<style lang="stylus" scoped></style>
