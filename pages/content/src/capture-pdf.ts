import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source
try {
  // Use the extension's worker file directly instead of creating a blob
  const workerSrc = chrome.runtime.getURL('pdf.worker.js');
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
} catch (error) {
  console.warn('Failed to initialize PDF.js worker:', error);
  // PDF.js will fall back to running in the main thread
}

export type PDFData = {
  type: 'pdf';
  title: string;
  url: string;
  content: string;
};

export const capturePDF = async (): Promise<PDFData | null> => {
  try {
    // Get the PDF URL
    const pdfUrl = window.location.href;

    // Load the PDF document with CORS headers
    const loadingTask = pdfjsLib.getDocument({
      url: pdfUrl,
      cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
      withCredentials: true,
    });

    const pdf = await loadingTask.promise;

    let fullText = '';

    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map(item => ('str' in item ? item.str : ''))
        .join(' ')
        .trim();

      fullText += pageText + '\n\n';
    }

    return {
      type: 'pdf',
      title: document.title || 'PDF Document',
      url: pdfUrl,
      content: fullText.trim(),
    };
  } catch (error) {
    console.error('Error processing PDF:', error);
    return null;
  }
};
