import 'webextension-polyfill';
// import { exampleThemeStorage } from '@extension/storage';
import debounce from 'debounce';
import type { RuleActionType, ResourceType } from 'chrome';
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

const filters = {
  url: [
    {
      hostSuffix: 'app.slack.com',
      pathContains: 'client',
    },
  ],
};

const handleLoadPage = async ({ tabId, url }: { tabId: number; url: string }) => {
  chrome.tabs.sendMessage(tabId, {
    type: 'loadPage',
    value: url,
  });
};
const handleLoadPageDebounced = debounce(handleLoadPage, 500);

chrome.webNavigation.onHistoryStateUpdated.addListener(handleLoadPageDebounced, filters);
chrome.webNavigation.onCompleted.addListener(handleLoadPageDebounced, filters);

const isSlackUrl = (url: string) => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.endsWith('slack.com');
  } catch {
    return false;
  }
};

const updateRedirectRule = async (enabled: boolean) => {
  if (enabled) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1],
      addRules: [
        {
          id: 1,
          priority: 1,
          action: {
            type: 'redirect' as RuleActionType,
            redirect: {
              url: 'https://app.slack.com/client',
            },
          },
          condition: {
            urlFilter: 'https://*.slack.com/archives/*',
            resourceTypes: ['main_frame' as ResourceType],
          },
        },
      ],
    });
  } else {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1],
    });
  }
};

chrome.runtime.onMessage.addListener((message, sender) => {
  if (!sender.tab || !sender.tab.id) {
    return;
  }

  if (message.type === 'SLACK_THREAD_DATA') {
    chrome.tabs.sendMessage(sender.tab.id, {
      type: 'THREAD_DATA_RESULT',
      url: sender.tab?.url,
      payload: message.data,
    });
  } else if (message.type === 'ARTICLE_DATA_RESULT') {
    chrome.tabs.sendMessage(sender.tab.id, {
      type: 'ARTICLE_DATA_RESULT',
      data: message.data,
    });
  } else if (message.type === 'RELOAD_AND_CAPTURE') {
    chrome.tabs.reload(sender.tab.id, {}, () => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
        const senderTabId = sender.tab?.id;
        if (!senderTabId || tabId !== senderTabId || changeInfo.status !== 'complete') {
          return;
        }
        chrome.tabs.onUpdated.removeListener(listener);
        setTimeout(() => {
          chrome.tabs.sendMessage(senderTabId, { type: 'CAPTURE_ARTICLE' });
        }, 1000);
      });
    });
  }

  if (message.type === 'OPEN_SIDE_PANEL') {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const currentTab = tabs[0];
      if (currentTab?.id) {
        chrome.sidePanel.open({ tabId: currentTab.id });
      }
    });
  }

  if (message.type === 'OPEN_IN_WEB_CHANGED') {
    updateRedirectRule(message.value);
  }

  if (message.type === 'GET_CURRENT_PAGE_TYPE') {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const currentTab = tabs[0];
      if (currentTab?.url) {
        chrome.runtime.sendMessage({
          type: 'CURRENT_PAGE_TYPE',
          isSlack: isSlackUrl(currentTab.url),
          url: currentTab.url,
        });
      }
    });
  }
});

chrome.storage.local.get('openInWeb', result => {
  updateRedirectRule(result.openInWeb);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.openInWeb) {
    updateRedirectRule(changes.openInWeb.newValue);
  }
});
