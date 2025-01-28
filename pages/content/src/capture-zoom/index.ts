import type { ZoomData } from './types';

const extractTranscriptFromVTT = (vttContent: string): string => {
  const lines = vttContent.split('\n');
  const transcript: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Skip timecodes and empty lines
    if (line.includes('-->') || line === '' || /^\d+$/.test(line)) {
      continue;
    }
    transcript.push(line);
  }

  return transcript.join(' ');
};

export const captureZoom = () => {
  const handleMessage = async (
    message: { type: string },
    _: chrome.runtime.MessageSender,
    sendResponse: () => void,
  ) => {
    if (message.type === 'CAPTURE_ARTICLE') {
      try {
        // Get the video title
        const titleElement = document.querySelector('.topic');
        const title = titleElement?.textContent?.trim() || 'Zoom Recording';

        // Find the video element in the player view
        const playerVideo = document.querySelector('.player-view video');

        if (!playerVideo) {
          throw new Error('Could not find player video element');
        }

        // Get the video source URL
        const videoSrc = playerVideo.getAttribute('src');

        if (!videoSrc) {
          throw new Error('Could not find video source');
        }

        // Extract the fid from the video source URL
        const videoUrl = new URL(videoSrc);
        const fid = videoUrl.searchParams.get('fid');

        if (!fid) {
          throw new Error('Could not find recording ID');
        }

        // Construct the transcript API URL
        const transcriptUrl = `https://${location.hostname}/rec/play/vtt?type=transcript&fid=${fid}&action=play`;

        // Fetch the transcript
        const response = await fetch(transcriptUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch transcript');
        }

        const vttContent = await response.text();
        console.log('vttContent :', vttContent);
        const data: ZoomData = {
          type: 'zoom',
          title,
          url: window.location.href,
          content: vttContent,
        };

        // Send the data back to the extension
        chrome.runtime.sendMessage({
          type: 'ARTICLE_DATA_RESULT',
          data,
        });
      } catch (error) {
        console.error('Failed to capture Zoom recording:', error);
        chrome.runtime.sendMessage({
          type: 'ARTICLE_DATA_RESULT',
          data: {
            type: 'zoom',
            title: 'Error',
            url: window.location.href,
            content: 'Failed to capture Zoom recording transcript.',
          },
        });
      }
    }
    sendResponse();
  };

  chrome.runtime.onMessage.addListener(handleMessage);
};
