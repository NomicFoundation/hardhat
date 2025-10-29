const defaultChangelog = require("@changesets/cli/changelog");

module.exports = {
  getReleaseLine: async (changeset) => {
    return defaultChangelog.getReleaseLine(changeset);
  },
  // We do not want dependency releases included in
  // our changelogs e.g. "  - Updated dependencies [e5ff273]"
  getDependencyReleaseLine: async () => {
    return "";
  },
};
