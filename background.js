const DEFAULT_COOKIE_STORE_ID = "firefox-default";

/**
 * @typedef {Object} Rule
 * @property {string} name - The name of the container.
 * @property {string[]} urls
 */

/**
 * @typedef {Object<string, string[]>} Rules
 */

/**
 * @type {Rules}
 */
const rules = {};

function toContainerName(url) {
  for (const u in rules) {
    if (url.includes(u)) {
      return rules[u];
    }
  }

  return null;
}

async function toContainer(name) {
  if (name === null) {
    return null;
  }

  const containers = await browser.contextualIdentities.query({
    name: name,
  });

  if (containers?.length > 0) {
    return containers[0];
  }

  return null;
}

async function onBeforeRequest(request) {
  const tab = await browser.tabs.get(request.tabId);

  if (tab.cookieStoreId !== "firefox-default") {
    return {};
  }

  const container = await toContainer(toContainerName(request.url));
  if (container === null) {
    return {};
  }

  if (tab.cookieStoreId === container.cookieStoreId) {
    return {};
  }

  // Create new tab in container
  await browser.tabs.create({
    url: request.url,
    cookieStoreId: container.cookieStoreId,
  });

  // Close the old tab
  await browser.tabs.remove(request.tabId);

  return { cancel: true };
}

async function updateRules() {
  /** @type {{rules: Rule[]}} */
  const storage = await browser.storage.sync.get("rules");
  if (!storage.rules?.length) {
    return;
  }

  for (const rule of storage.rules) {
    for (url of rule.urls) {
      rules[url] = rule.name;
    }
  }
}

(async () => {
  await updateRules();
  browser.storage.sync.onChanged.addListener(updateRules);

  // Listen for web requests
  browser.webRequest.onBeforeRequest.addListener(
    onBeforeRequest,
    {
      urls: ["<all_urls>"],
      types: ["main_frame"],
    },
    ["blocking"],
  );
})();
