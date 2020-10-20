<template lang="pug">
div
  HHWhyHardhat
  HHStartBuilding
  HHWhosUsingHardhat
  HHTestimonials
  HHBuiltBy
</template>

<script>
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
  },
};
</script>

<style lang="stylus" scoped></style>
