(function () {
  let cachedUserMap = null;
  let lastFetchTime = 0;
  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

  function replaceUserMentions(text, userMap) {
    // Replace <@U1234|username> format
    text = text.replace(/<@(U[A-Z0-9]+)\|[^>]+>/g, (match, userId) => {
      const user = userMap.get(userId);
      return user ? `@${user.display_name || user.real_name || user.name}` : match;
    });

    // Replace <@U1234> format
    text = text.replace(/<@(U[A-Z0-9]+)>/g, (match, userId) => {
      const user = userMap.get(userId);
      return user ? `@${user.display_name || user.real_name || user.name}` : match;
    });

    return text;
  }

  /**
   * Generate query parameters matching Slack's format
   * @returns {URLSearchParams}
   */
  function generateQueryParams() {
    const bootData = window.boot_data || {};
    const teamId = bootData?.team_id || location.pathname.split('/')[1];

    return new URLSearchParams({
      _x_id: `${Math.random().toString(16).slice(2)}-${Date.now()}.${Math.floor(Math.random() * 1000)}`,
      _x_csid: bootData?.client_session_id || document.cookie.match(/_x_csid=([^;]+)/)?.[1] || '',
      slack_route: teamId,
      _x_version_ts: bootData?.version_ts || String(Math.floor(Date.now() / 1000)),
      _x_frontend_build_type: 'current',
      _x_desktop_ia: '4',
      _x_gantry: 'true',
      fp: '15',
      _x_num_retries: '0',
    });
  }

  async function fetchSlackUsers(token) {
    try {
      const baseUrl = new URL('/api/users.list', window.location.origin);
      const queryParams = generateQueryParams();
      baseUrl.search = queryParams.toString();

      const formData = new URLSearchParams({
        token: token,
        limit: '1000',
        include_locale: 'false',
        _x_reason: 'user-list-store.fetch',
        _x_mode: 'online',
        _x_sonic: 'true',
      });

      const response = await fetch(baseUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      return new Map(
        data.members.map(user => [
          user.id,
          {
            id: user.id,
            name: user.name,
            real_name: user.real_name,
            title: user.profile.title,
            display_name: user.profile.display_name,
          },
        ]),
      );
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  // Helper function to process reactions - add this before fetchSlackThread
  function processReactions(reactions, userMap) {
    if (!reactions) return [];

    return reactions.map(reaction => ({
      name: reaction.name,
      count: reaction.count,
      users: reaction.users || [],
      userDetails: (reaction.users || [])
        .map(userId => userMap.get(userId))
        .filter(Boolean)
        .map(user => ({
          name: user.display_name || user.real_name || user.name,
          id: user.id,
        })),
    }));
  }

  async function getUserMap(token) {
    const now = Date.now();

    // Return cached data if it's fresh
    if (cachedUserMap && now - lastFetchTime < CACHE_DURATION) {
      return cachedUserMap;
    }

    // Fetch fresh data
    try {
      cachedUserMap = await fetchSlackUsers(token);
      lastFetchTime = now;
      return cachedUserMap;
    } catch (error) {
      // If fetch fails and we have cached data, return it as fallback
      if (cachedUserMap) {
        console.warn('Failed to fetch fresh user data, using cached data:', error);
        return cachedUserMap;
      }
      throw error;
    }
  }

  /**
   * Fetches a complete thread given channel and thread timestamp
   * @param {string} channel - Channel ID (e.g. "C0414C2HNAW")
   * @param {string} threadTs - Thread parent message timestamp (e.g. "1733882111.623399")
   * @param {string} token - Slack API token
   * @returns {Promise<Object>} Thread data
   */
  async function fetchSlackThread(channel, threadTs, token) {
    try {
      if (!token) {
        throw new Error('Could not find Slack token');
      }

      const userMap = await getUserMap(token);

      // Generate base URL with query parameters
      const baseUrl = new URL('/api/conversations.replies', window.location.origin);
      const queryParams = generateQueryParams();
      baseUrl.search = queryParams.toString();

      // Prepare form data
      const formData = new URLSearchParams({
        token: token,
        channel: channel,
        ts: threadTs,
        inclusive: 'true',
        limit: '100',
        _x_reason: 'channel-history-store.CFM.fetch',
        _x_mode: 'online',
        _x_sonic: 'true',
        _x_app_name: 'client',
      });

      const response = await fetch(baseUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      return {
        thread_ts: threadTs,
        channel_id: channel,
        message_count: data.messages.length,
        messages: data.messages.map(msg => {
          const userDetails = userMap.get(msg.user);
          return {
            id: msg.client_msg_id,
            ts: msg.ts,
            thread_ts: msg.thread_ts,
            user: userDetails ? userDetails.display_name || userDetails.real_name || userDetails.name : msg.user,
            user_details: userDetails,
            text: replaceUserMentions(msg.text, userMap),
            reply_count: msg.reply_count,
            reply_users_count: msg.reply_users_count,
            latest_reply: msg.latest_reply,
            blocks: msg.blocks,
            files: msg.files,
            reactions: processReactions(msg.reactions, userMap),
            edited: msg.edited,
          };
        }),
      };
    } catch (error) {
      throw error;
    }
  }

  // Make it available globally
  window.fetchSlackThread = fetchSlackThread;

  // Example usage in console:
  // fetchSlackThread("C0414C2HNAW", "1733882111.623399").then(console.log).catch(console.error);
})();

(function () {
  const XHR = XMLHttpRequest.prototype;
  const originalOpen = XHR.open;
  const originalSend = XHR.send;

  XHR.open = function (...args) {
    this._url = args[1];
    return originalOpen.apply(this, args);
  };

  XHR.send = function (...args) {
    const self = this;

    // Capture token from JSON data if present
    if (args[0] && typeof args[0] === 'string') {
      try {
        const jsonData = JSON.parse(args[0]);
        if (jsonData.token) {
          sessionStorage.setItem('slack-token', jsonData.token);
        }
      } catch (error) {
        // If it's not JSON, try form data as fallback
        if (args[0].includes('token=')) {
          try {
            const formData = new URLSearchParams(args[0]);
            const token = formData.get('token');
            if (token) {
              sessionStorage.setItem('slack-token', token);
            }
          } catch (formError) {
            // Keep error logging for production error tracking
            console.error('Error extracting token from form data:', formError);
          }
        }
      }
    }

    const originalOnReadyStateChange = self.onreadystatechange;

    self.onreadystatechange = function () {
      if (self.readyState === 4) {
        if (typeof self._url === 'string' && self._url.includes('/api/conversations.replies')) {
          try {
            const data = JSON.parse(self.responseText);
            window.postMessage(
              {
                type: 'SLACK_THREAD_DATA',
                url: self._url,
                data: data,
                token: sessionStorage.getItem('slack-token'),
                timestamp: new Date().toISOString(),
              },
              '*',
            );
          } catch (error) {
            // Keep error logging for production error tracking
            console.error('Error processing XHR thread response:', error);
          }
        }
      }

      if (originalOnReadyStateChange) {
        originalOnReadyStateChange.apply(this, arguments);
      }
    };

    return originalSend.apply(this, args);
  };
})();

(function () {
  let lastUrl = window.location.href;
  let observer = null;

  function checkUrlChange() {
    if (window.location.href !== lastUrl) {
      const oldUrl = lastUrl;
      lastUrl = window.location.href;
      handleUrlChange(oldUrl, lastUrl);
    }
  }

  function parseThreadTs(url) {
    const patterns = [
      /\/p(\d+)$/, // archives/messages format
      /\/(\d+\.\d+)$/, // client format
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        const ts = match[1].replace(/^(\d{10})(\d{6})$/, '$1.$2');
        return ts;
      }
    }
    return null;
  }

  async function handleUrlChange(oldUrl, newUrl) {
    const threadTs = parseThreadTs(newUrl);
    if (!threadTs) return;

    const token = sessionStorage.getItem('slack-token');
    if (!token) return;

    try {
      const channelId = newUrl.split('/archives/')[1]?.split('/')[0];
      if (!channelId) return;

      const response = await fetch('https://slack.com/api/conversations.replies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          channel: channelId,
          ts: threadTs,
          limit: 1000,
        }),
      });

      const data = await response.json();
      if (data.ok) {
        window.postMessage(
          {
            type: 'SLACK_THREAD_DATA',
            url: newUrl,
            data: data,
            token: token,
            timestamp: new Date().toISOString(),
          },
          '*',
        );
      }
    } catch (error) {
      // Keep error logging for production error tracking
      console.error('Error fetching thread data:', error);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    const messages = document.querySelectorAll('[data-ts]');
    for (const msg of messages) {
      if (msg.getAttribute('data-ts') === threadTs) {
        msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const threadButton =
          msg.querySelector('[data-qa="message_thread_button"]') || msg.querySelector('[data-qa="message_content"]');
        if (threadButton) {
          threadButton.click();
          break;
        }
      }
    }
  }

  function setupObserver() {
    if (observer) {
      observer.disconnect();
    }

    if (document.body) {
      observer = new MutationObserver(checkUrlChange);
      observer.observe(document.body, { subtree: true, childList: true });
      setInterval(checkUrlChange, 1000);
      handleUrlChange('', window.location.href);
    } else {
      setTimeout(setupObserver, 100);
    }
  }

  setupObserver();

  window.openSlackThread = async threadTs => {
    const messages = document.querySelectorAll('[data-ts]');
    for (const msg of messages) {
      if (msg.getAttribute('data-ts') === threadTs) {
        msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const threadButton =
          msg.querySelector('[data-qa="message_thread_button"]') || msg.querySelector('[data-qa="message_content"]');
        if (threadButton) {
          threadButton.click();
          return true;
        }
      }
    }
    return false;
  };
})();

window.addEventListener('message', async event => {
  if (event.data.type === 'FETCH_THREAD_DATA') {
    const { channel, threadTs } = event.data.payload;
    const token = sessionStorage.getItem('slack-token');

    if (!token) {
      return;
    }

    try {
      const threadData = await window.fetchSlackThread(channel, threadTs, token);
      window.postMessage(
        {
          type: 'THREAD_DATA_RESULT',
          payload: threadData,
        },
        '*',
      );
    } catch (error) {
      // Keep error logging for production error tracking
      console.error('Error in message handler:', error);
    }
  }
});
