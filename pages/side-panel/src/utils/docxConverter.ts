import { Document, Packer, Paragraph, TextRun } from 'docx';
import { getFormattedText } from './textFormatters';

export const convertToDocx = async (markdown: string): Promise<Blob> => {
  const formattedText = getFormattedText(markdown);

  // Split into paragraphs
  const paragraphs = formattedText.split('\n\n').map(
    text =>
      new Paragraph({
        children: [new TextRun(text.trim())],
        spacing: {
          after: 200, // Add some spacing between paragraphs
        },
      }),
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  return await Packer.toBlob(doc);
};
