import fs from 'node:fs';
import deepmerge from 'deepmerge';

const packageJson = JSON.parse(fs.readFileSync('../package.json', 'utf8'));

const isFirefox = process.env.__FIREFOX__ === 'true';

const sidePanelConfig = {
  side_panel: {
    default_path: 'side-panel/index.html',
  },
  permissions: ['sidePanel'],
};

/**
 * After changing, please reload the extension at `chrome://extensions`
 * @type {chrome.runtime.ManifestV3}
 */
const manifest = deepmerge(
  {
    manifest_version: 3,
    default_locale: 'en',
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAurgcYc68N3/+CxjjB2djy7J34TjQ3hyl/HQ8XjvHJm0+QESSieRAftqhhHynwjFno94gtBC+MQ+SlSPdorTDPHZK7NEAMTALDYKr1oLV8vWwgrxRAiR5SKwrhDr43BBc+Rp9tpc+49VZgHEug1EtYv4jl9xJxbQK80b2AIAWxNcR7jYL7/ef07wC9rIPtBNxPKNZ8FxgFgeEPGGDBcoTunHcx+7NXz4uGcL4ja4Yxaa7rGgsKdfswr8uBH3dLI6hD3lcre2+kKqMaECOJ78KDaZ2WqzZZRitOpfbxWC/WdhEE1bcx1B9u3i7jFOvtEW8q/ZaURO4RI0ySEKvoVgsPwIDAQAB',
    /**
     * if you want to support multiple languages, you can use the following reference
     * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization
     */
    name: '__MSG_extensionName__',
    version: packageJson.version,
    description: '__MSG_extensionDescription__',
    host_permissions: ['<all_urls>'],
    permissions: ['storage', 'scripting', 'tabs', 'webNavigation', 'declarativeNetRequest'],
    options_page: 'options/index.html',
    background: {
      service_worker: 'background.iife.js',
      type: 'module',
    },
    action: {
      // default_popup: 'popup/index.html',
      default_icon: 'icon-34.png',
    },
    // chrome_url_overrides: {
    //   newtab: 'new-tab/index.html',
    // },
    icons: {
      128: 'icon-128.png',
    },
    content_scripts: [
      {
        matches: ['<all_urls>'],
        js: ['content/index.iife.js'],
        run_at: 'document_start',
      },
      {
        matches: ['*://app.slack.com/*'],
        js: ['content-ui/index.iife.js'],
      },
      {
        matches: ['*://app.slack.com/*'],
        css: ['content.css'], // public folder
      },
    ],
    // devtools_page: 'devtools/index.html',
    web_accessible_resources: [
      {
        resources: ['*.js', '*.json', '*.css', '*.svg', 'icon-128.png', 'icon-34.png', 'injected.js'],
        matches: ['*://*/*'],
      },
    ],
    declarative_net_request: {
      rule_resources: [
        {
          id: 'ruleset_1',
          enabled: true,
          path: 'rules.json',
        },
      ],
    },
  },
  !isFirefox && sidePanelConfig,
);

export default manifest;
