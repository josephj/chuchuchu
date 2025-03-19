import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

const createHeading = (text: string, level: number) => {
  return new Paragraph({
    text: text.trim(),
    heading: HeadingLevel[`HEADING_${level}` as keyof typeof HeadingLevel],
    spacing: {
      before: 400,
      after: 200,
    },
  });
};

const createCodeBlock = (text: string) => {
  return new Paragraph({
    children: [
      new TextRun({
        text: text,
        font: 'Courier New',
        size: 24, // 12pt
      }),
    ],
    spacing: {
      before: 200,
      after: 200,
    },
    indent: {
      left: 720, // 0.5 inch
      right: 720,
    },
  });
};

const createBlockquote = (text: string) => {
  return new Paragraph({
    children: [
      new TextRun({
        text: text,
        italics: true,
        font: 'Open Sans',
      }),
    ],
    spacing: {
      before: 200,
      after: 200,
    },
    indent: {
      left: 720, // 0.5 inch
      right: 720,
    },
    alignment: AlignmentType.JUSTIFIED,
  });
};

const createList = (items: string[], isOrdered: boolean) => {
  return items.map((item, index) => {
    return new Paragraph({
      children: [
        new TextRun({
          text: `${isOrdered ? `${index + 1}. ` : '• '}${item.trim()}`,
          font: 'Open Sans',
        }),
      ],
      spacing: {
        before: 100,
        after: 100,
      },
      indent: {
        left: 720, // 0.5 inch
      },
    });
  });
};

export const convertToDocx = async (markdown: string): Promise<Blob> => {
  const paragraphs: Paragraph[] = [];
  const lines = markdown.split('\n');
  let currentList: string[] = [];
  let isOrderedList = false;
  let currentCodeBlock = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks
    if (line.startsWith('```')) {
      if (currentCodeBlock) {
        paragraphs.push(createCodeBlock(currentCodeBlock));
        currentCodeBlock = '';
      } else {
        currentCodeBlock = '';
      }
      continue;
    }

    if (currentCodeBlock) {
      currentCodeBlock += line + '\n';
      continue;
    }

    // Handle headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      paragraphs.push(createHeading(headerMatch[2], level));
      continue;
    }

    // Handle blockquotes
    if (line.startsWith('> ')) {
      paragraphs.push(createBlockquote(line.slice(2)));
      continue;
    }

    // Handle lists
    if (line.match(/^\s*[-*+]\s+/)) {
      if (currentList.length === 0) {
        isOrderedList = false;
      }
      currentList.push(line.replace(/^\s*[-*+]\s+/, ''));
      continue;
    }

    if (line.match(/^\s*\d+\.\s+/)) {
      if (currentList.length === 0) {
        isOrderedList = true;
      }
      currentList.push(line.replace(/^\s*\d+\.\s+/, ''));
      continue;
    }

    // Process current list if we're done with it
    if (currentList.length > 0 && !line.match(/^\s*[-*+]\s+/) && !line.match(/^\s*\d+\.\s+/)) {
      paragraphs.push(...createList(currentList, isOrderedList));
      currentList = [];
    }

    // Handle regular text with inline formatting
    if (line.trim()) {
      const textRuns: TextRun[] = [];
      let currentText = '';
      let isBold = false;
      let isItalic = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        const nextChar = line[j + 1];

        if (char === '*' && nextChar === '*') {
          if (currentText) {
            textRuns.push(
              new TextRun({
                text: currentText,
                bold: isBold,
                italics: isItalic,
              }),
            );
            currentText = '';
          }
          isBold = !isBold;
          j++;
          continue;
        }

        if (char === '*' && !isBold) {
          if (currentText) {
            textRuns.push(
              new TextRun({
                text: currentText,
                bold: isBold,
                italics: isItalic,
              }),
            );
            currentText = '';
          }
          isItalic = !isItalic;
          continue;
        }

        currentText += char;
      }

      if (currentText) {
        textRuns.push(
          new TextRun({
            text: currentText,
            bold: isBold,
            italics: isItalic,
          }),
        );
      }

      paragraphs.push(
        new Paragraph({
          children: textRuns,
          spacing: {
            before: 100,
            after: 100,
          },
        }),
      );
    }
  }

  // Process any remaining list
  if (currentList.length > 0) {
    paragraphs.push(...createList(currentList, isOrderedList));
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
    styles: {
      default: {
        document: {
          run: {
            font: 'Open Sans',
            size: 28, // 14pt for normal text
          },
        },
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            size: 48, // 24pt
            bold: true,
            color: '000000',
            font: 'Open Sans',
          },
          paragraph: {
            spacing: {
              before: 480,
              after: 240,
            },
          },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            size: 44, // 22pt
            bold: true,
            color: '000000',
            font: 'Open Sans',
          },
          paragraph: {
            spacing: {
              before: 440,
              after: 220,
            },
          },
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            size: 40, // 20pt
            bold: true,
            color: '000000',
            font: 'Open Sans',
          },
          paragraph: {
            spacing: {
              before: 400,
              after: 200,
            },
          },
        },
        {
          id: 'Heading4',
          name: 'Heading 4',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            size: 36, // 18pt
            bold: true,
            color: '000000',
            font: 'Open Sans',
          },
          paragraph: {
            spacing: {
              before: 360,
              after: 180,
            },
          },
        },
        {
          id: 'Heading5',
          name: 'Heading 5',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            size: 32, // 16pt
            bold: true,
            color: '000000',
            font: 'Open Sans',
          },
          paragraph: {
            spacing: {
              before: 320,
              after: 160,
            },
          },
        },
        {
          id: 'Heading6',
          name: 'Heading 6',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            size: 30, // 15pt
            bold: true,
            color: '000000',
            font: 'Open Sans',
          },
          paragraph: {
            spacing: {
              before: 280,
              after: 140,
            },
          },
        },
      ],
    },
  });

  return await Packer.toBlob(doc);
};
