import defaultChangelog from "@changesets/cli/changelog";

export default {
  getReleaseLine: async (changeset, type, changelogOpts) => {
    return defaultChangelog.getReleaseLine(changeset, type, changelogOpts);
  },

  // We do not want dependency releases included in
  // our changelogs e.g. "  - Updated dependencies [e5ff273]"
  getDependencyReleaseLine: async () => {
    return "";
  },
};
