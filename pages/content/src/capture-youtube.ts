export type YouTubeData = {
  title: string | null;
  description: string | null;
  transcript: string | null;
  channel: string | null;
  publishDate: string | null;
  url: string;
};

const getVideoId = (url: string): string | null => {
  console.log('[DEBUG] Extracting video ID from URL:', url);
  const urlObj = new URL(url);
  const videoId = urlObj.searchParams.get('v');
  console.log('[DEBUG] Extracted video ID:', videoId);
  return videoId;
};

type CaptionTrack = {
  baseUrl: string;
  vssId?: string;
  languageCode?: string;
  name?: { simpleText: string };
  kind?: string;
};

type YouTubePlayerResponse = {
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: CaptionTrack[];
    };
  };
};

const getTranscriptFromAPI = async (videoId: string): Promise<string | null> => {
  console.log('[DEBUG] Attempting to get transcript from API');
  try {
    // First get the caption tracks from the timedtext API
    const tracksResponse = await fetch(`https://www.youtube.com/api/timedtext?v=${videoId}&type=list`);
    const tracksXML = await tracksResponse.text();
    const parser = new DOMParser();
    const tracksDoc = parser.parseFromString(tracksXML, 'text/xml');
    const tracks = Array.from(tracksDoc.getElementsByTagName('track'));

    // Find English track or use the first available
    const englishTrack =
      tracks.find(
        track => track.getAttribute('lang_code') === 'en' || track.getAttribute('lang_original') === 'English',
      ) || tracks[0];

    if (!englishTrack) {
      console.log('[DEBUG] No caption tracks found');
      return null;
    }

    const lang = englishTrack.getAttribute('lang_code');
    const name = englishTrack.getAttribute('name');

    // Get the actual transcript
    const transcriptResponse = await fetch(
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}${name ? `&name=${name}` : ''}`,
    );
    const transcriptXML = await transcriptResponse.text();
    const transcriptDoc = parser.parseFromString(transcriptXML, 'text/xml');
    const textElements = transcriptDoc.getElementsByTagName('text');

    if (textElements.length === 0) {
      console.log('[DEBUG] No text elements found in transcript');
      return null;
    }

    const transcript = Array.from(textElements)
      .map(element => element.textContent?.replace(/&#39;/g, "'") || '')
      .join(' ');

    console.log('[DEBUG] Extracted transcript:', transcript.substring(0, 200) + '...');
    return transcript;
  } catch (error) {
    console.error('[DEBUG] Error getting transcript from API:', error);
    return null;
  }
};

const getTranscriptFromScripts = async (): Promise<string | null> => {
  console.log('[DEBUG] Attempting to get transcript');
  try {
    const currentVideoId = getVideoId(window.location.href);
    console.log('[DEBUG] Current video ID:', currentVideoId);
    if (!currentVideoId) {
      console.log('[DEBUG] No video ID found');
      return null;
    }

    // Try the API method first
    const apiTranscript = await getTranscriptFromAPI(currentVideoId);
    if (apiTranscript) {
      return apiTranscript;
    }

    // Fall back to the old method if API fails
    const scripts = Array.from(document.querySelectorAll('script'));
    console.log('[DEBUG] Found script tags:', scripts.length);

    for (const script of scripts) {
      const content = script.textContent || '';

      // Look for the ytInitialPlayerResponse object
      if (content.includes('ytInitialPlayerResponse')) {
        console.log('[DEBUG] Found ytInitialPlayerResponse script');

        // Extract the JSON object
        const match = content.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
        if (match && match[1]) {
          console.log('[DEBUG] Found player response data');
          const playerResponse = JSON.parse(match[1]) as YouTubePlayerResponse;
          console.log('[DEBUG] Player response parsed:', playerResponse?.captions?.playerCaptionsTracklistRenderer);

          const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
          if (captionTracks && captionTracks.length > 0) {
            console.log('[DEBUG] Found caption tracks:', captionTracks);

            // Find English captions or use the first available
            const englishTrack =
              captionTracks.find(track => track.languageCode === 'en' || track.vssId?.includes('.en')) ||
              captionTracks[0];

            if (englishTrack?.baseUrl) {
              console.log('[DEBUG] Found caption track URL:', englishTrack.baseUrl);
              const response = await fetch(englishTrack.baseUrl);
              const xmlText = await response.text();
              console.log('[DEBUG] Fetched caption XML:', xmlText.substring(0, 200) + '...');

              // Parse the XML to extract text
              const parser = new DOMParser();
              const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
              const textElements = xmlDoc.getElementsByTagName('text');
              console.log('[DEBUG] Found text elements:', textElements.length);

              const transcript = Array.from(textElements)
                .map(element => element.textContent?.replace(/&#39;/g, "'") || '')
                .join(' ');

              console.log('[DEBUG] Extracted transcript:', transcript.substring(0, 200) + '...');
              return transcript;
            } else {
              console.log('[DEBUG] No baseUrl found in caption track');
            }
          } else {
            console.log('[DEBUG] No caption tracks found in player response');
          }
        }
      }
    }

    console.log('[DEBUG] No valid transcript data found in any script');
    return null;
  } catch (error) {
    console.error('[DEBUG] Error getting transcript from scripts:', error);
    return null;
  }
};

const getDescriptionFromPage = async (): string | null => {
  console.log('[DEBUG] Attempting to get description from page');
  try {
    const expandButton = document.querySelector('tp-yt-paper-button#expand');
    if (expandButton instanceof HTMLElement) {
      console.log('[DEBUG] Found expand button, clicking it');
      expandButton.click();
      // Give a small delay for the content to expand
      // We'll still try to get the content immediately in case the button was already clicked
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const selectors = [
      '#description-inline-expander .ytd-text-inline-expander',
      '#description-inline-expander ytd-expander[collapsed] #description',
      '#description-inline-expander #description',
      'ytd-expander[slot="expander"] #content',
    ];

    let description: string | null = null;

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element?.textContent) {
        description = element.textContent;
        break;
      }
    }

    const trimmedDescription = description?.trim() || null;
    console.log(
      '[DEBUG] >>>> Found description:',
      trimmedDescription ? 'Yes' : 'No',
      'Length:',
      trimmedDescription?.length,
    );
    return trimmedDescription;
  } catch (error) {
    console.error('[DEBUG] Error getting description from page:', error);
    return null;
  }
};

const getChannelFromPage = (): string | null => {
  console.log('[DEBUG] Attempting to get channel from page');
  try {
    const channel = document.querySelector('#owner #channel-name a')?.textContent?.trim() || null;
    console.log('[DEBUG] Found channel:', channel);
    return channel;
  } catch (error) {
    console.error('[DEBUG] Error getting channel from page:', error);
    return null;
  }
};

const getPublishDateFromPage = (): string | null => {
  console.log('[DEBUG] Attempting to get publish date from page');
  try {
    const publishDate = document.querySelector('#info-strings yt-formatted-string')?.textContent?.trim() || null;
    console.log('[DEBUG] Found publish date:', publishDate);
    return publishDate;
  } catch (error) {
    console.error('[DEBUG] Error getting publish date from page:', error);
    return null;
  }
};

export const captureYouTube = () => {
  const handleMessage = async (
    message: { type: string },
    _: chrome.runtime.MessageSender,
    sendResponse: () => void,
  ) => {
    console.log('[DEBUG] YouTube capture message received:', message);
    if (message.type === 'CAPTURE_ARTICLE') {
      try {
        console.log('[DEBUG] Starting YouTube content capture');

        // Try to get transcript from script tags first, then fall back to page scraping
        const transcript = await getTranscriptFromScripts(); //) || getTranscriptFromPage();
        console.log('[DEBUG] transcript --->>>', transcript);

        const description = await getDescriptionFromPage();
        const data: YouTubeData = {
          title: document.title.replace('- YouTube', '').trim(),
          description,
          transcript,
          channel: getChannelFromPage(),
          publishDate: getPublishDateFromPage(),
          url: window.location.href,
        };

        console.log('[DEBUG] Final captured data:', data);
        chrome.runtime.sendMessage({
          type: 'ARTICLE_DATA_RESULT',
          data,
        });
      } catch (error) {
        console.error('[DEBUG] Error capturing YouTube content:', error);
        sendResponse();
      }
    }
    sendResponse();
  };

  chrome.runtime.onMessage.addListener(handleMessage);
};
