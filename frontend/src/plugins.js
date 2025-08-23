// frontend/src/plugins.js

export async function loadPlugins() {
  const modules = import.meta.glob('./plugins/*/index.js');
  const pluginData = {
    routes: [],
    menuItems: [],
  };

  for (const path in modules) {
    const module = await modules[path]();
    if (module.routes) {
      pluginData.routes.push(...module.routes);
    }
    if (module.menuItems) {
      pluginData.menuItems.push(...module.menuItems);
    }
  }

  return pluginData;
}