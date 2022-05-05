import type { NextPage } from "next";

import PluginsLayout from "../../components/PluginsLayout";

const Plugins: NextPage = () => {
  return (
    <PluginsLayout
      seo={{
        title: "Plugins",
        description: "Plugins",
      }}
    >
      <div>
        <h2>Plugins Page</h2>
        <h2 id="community-plugins">Community plugins</h2>
      </div>
    </PluginsLayout>
  );
};

export default Plugins;
