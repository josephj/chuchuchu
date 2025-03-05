export const getFormattedText = (markdown: string): string => {
  // Remove code blocks completely
  let text = markdown.replace(/```[\s\S]*?```/g, '');

  // Convert headers
  text = text.replace(/^#{1,6}\s+(.+)$/gm, '$1\n');

  // Remove markdown formatting characters
  text = text
    .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
    .replace(/\*(.+?)\*/g, '$1') // Italic
    .replace(/`(.+?)`/g, '$1') // Inline code
    .replace(/~~(.+?)~~/g, '$1') // Strikethrough
    .replace(/\[(.+?)\]\(.+?\)/g, '$1'); // Links

  // Convert lists to plain text with proper spacing
  text = text
    .replace(/^\s*[-*+]\s+/gm, '• ') // Unordered lists
    .replace(/^\s*\d+\.\s+/gm, '1. '); // Ordered lists

  // Convert blockquotes
  text = text.replace(/^\s*>\s+(.+)$/gm, '$1\n');

  // Normalize whitespace
  text = text
    .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newlines
    .trim();

  return text;
};

export const removeThinkBlocks = (content: string): string => {
  return content.replace(/<think>[\s\S]*?<\/think>/g, '');
};
