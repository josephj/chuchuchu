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
    /**
     * if you want to support multiple languages, you can use the following reference
     * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization
     */
    name: '__MSG_extensionName__',
    version: packageJson.version,
    description: '__MSG_extensionDescription__',
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1XCCEbiWvMdvHbLlNaKQaxvqkSXxsh1HW3iXuUcgamczrT8ZHs9jZ50rSA6S5wuWXWtt3iPpv0QLgetU1e4puSJZqTBw2zIkvAQ478ZEYQp5id8RayX/P5M6sY6xtwF+RTq7b9+FOBEOYcVaIoIzdmSCDVYnOubwf395jGdK3+YcwlxEA5hK1HRJ7gYeB4c04DY3BUS8/itcfAvZsgdaxyWfJK9hWGNfW7UCYhXHoM/O9+fCLCvJEutQc/RiN1iEXvh76AjTRXgqvS+Ue6lC5Ju/Kc7olIH2mKDreIX43sEPTxMY96DEfhSNNbcVrquuJ+zlqwyvZ9tYF5lA+/YT2wIDAQAB',
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
      {
        resources: ['pdf.worker.js'],
        matches: ['<all_urls>'],
      },
    ],
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
    },
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
