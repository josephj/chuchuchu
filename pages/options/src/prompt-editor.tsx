import { Box, FormControl, FormLabel, useColorModeValue } from '@chakra-ui/react';
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  linkPlugin,
  markdownShortcutPlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  toolbarPlugin,
  UndoRedo,
  CreateLink,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  DiffSourceToggleWrapper,
} from '@mdxeditor/editor';
import type { MDXEditorMethods } from '@mdxeditor/editor';
import { useRef, useEffect } from 'react';

import '@mdxeditor/editor/style.css';

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export const PromptEditor = ({ value, onChange }: Props) => {
  const ref = useRef<MDXEditorMethods>(null);
  const textColor = useColorModeValue('dracula.light.foreground', 'dracula.foreground');
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const buttonBg = useColorModeValue('transparent', 'whiteAlpha.300');
  const buttonHoverBg = useColorModeValue('gray.100', 'whiteAlpha.400');
  const buttonActiveBg = useColorModeValue('gray.200', 'whiteAlpha.500');
  const codeBg = useColorModeValue('gray.100', 'gray.700');
  const tableBg = useColorModeValue('gray.50', 'gray.700');
  const quoteColor = useColorModeValue('gray.500', 'gray.400');
  const codeColor = useColorModeValue('dracula.pink', 'dracula.purple');

  useEffect(() => {
    if (ref.current) {
      ref.current.setMarkdown(value || '');
    }
  }, [value]);

  return (
    <Box>
      <FormControl height="100%">
        <FormLabel color={textColor}>Prompt</FormLabel>
        <Box
          sx={{
            position: 'relative',
            '.mdxeditor': {
              height: '500px',
              overflow: 'auto',
              backgroundColor: bg,
              border: '1px solid',
              borderColor,
              borderRadius: 'md',
            },
            '.mdxeditor-toolbar': {
              backgroundColor: bg,
              borderBottom: '1px solid',
              borderColor,
              position: 'sticky',
              top: 0,
              zIndex: 1,
              button: {
                color: textColor,
                backgroundColor: buttonBg,
                '&:hover': {
                  backgroundColor: buttonHoverBg,
                },
                '&[data-state="on"]': {
                  backgroundColor: buttonActiveBg,
                },
              },
              '.mdxeditor-toolbar-group': {
                borderColor,
              },
            },
            '.mdxeditor-root-contenteditable': {
              fontSize: '14px',
              height: '100%',
              padding: '10px',
              '[aria-label="editable markdown"]': {
                color: `${textColor} !important`,
              },
              'ul, ol': {
                paddingLeft: '2rem',
                marginY: '0.5rem',
              },
              p: {
                marginBottom: '0.5rem',
              },
              li: {
                whiteSpace: 'normal',
              },
              // ul: {
              //   listStyle: 'disc',
              // },
              // ol: {
              //   listStyle: 'decimal',
              // },
              // 'li > ul, li > ol': {
              //   marginY: '0.25rem',
              // },
              // p: {
              //   marginY: '0.5rem',
              // },
              'h1, h2, h3, h4, h5, h6': {
                fontWeight: 'bold',
                // marginY: '1rem',
                color: textColor,
              },
              h1: { fontSize: '2xl' },
              h2: { fontSize: 'xl' },
              h3: { fontSize: 'lg' },
              blockquote: {
                // borderLeftWidth: '4px',
                borderLeftColor: borderColor,
                // paddingLeft: '1rem',
                // marginY: '1rem',
                color: quoteColor,
              },
              'code, code > span': {
                fontFamily: 'mono',
                backgroundColor: codeBg,
                borderRadius: 'sm',
                color: codeColor,
              },
              code: {
                display: 'inline-block',
                marginX: '0.2rem',
                borderRadius: 'md',
              },
              pre: {
                backgroundColor: codeBg,
                borderRadius: 'md',
                margin: '1rem 0',
              },
              'pre code': {
                display: 'block',
                padding: '1rem',
                overflow: 'auto',
                color: textColor,
                backgroundColor: 'transparent',
              },
              '.cm-editor': {
                '.cm-content': {
                  color: textColor,
                  backgroundColor: codeBg,
                },
                '.cm-gutters': {
                  backgroundColor: codeBg,
                  color: textColor,
                  borderRight: '1px solid',
                  borderColor,
                },
              },
              table: {
                borderCollapse: 'collapse',
                width: '100%',
                marginY: '1rem',
              },
              'th, td': {
                border: '1px solid',
                borderColor,
                padding: '0.5rem',
                color: textColor,
              },
              th: {
                backgroundColor: tableBg,
                fontWeight: 'bold',
              },
            },
            '.mdxeditor-popup-container': {
              '.mdxeditor-select-content': {
                backgroundColor: bg,
                borderColor,
                borderWidth: '1px',
                borderRadius: 'md',
                boxShadow: 'lg',
                padding: '4px',
                '[role="option"]': {
                  color: textColor,
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderRadius: 'sm',
                  '&:hover': {
                    backgroundColor: buttonHoverBg,
                  },
                  '&[data-state="checked"]': {
                    backgroundColor: buttonActiveBg,
                  },
                },
              },
            },
          }}>
          <MDXEditor
            ref={ref}
            plugins={[
              // Core plugins
              toolbarPlugin({
                toolbarContents: () => (
                  <DiffSourceToggleWrapper>
                    <UndoRedo />
                    <ListsToggle />
                    <CreateLink />
                    <InsertTable />
                    <InsertThematicBreak />
                  </DiffSourceToggleWrapper>
                ),
              }),
              listsPlugin(),
              quotePlugin(),
              headingsPlugin(),
              markdownShortcutPlugin(),
              linkPlugin(),
              tablePlugin(),
              thematicBreakPlugin(),
              codeBlockPlugin(),
              codeMirrorPlugin({
                codeBlockLanguages: {
                  js: 'JavaScript',
                  ts: 'TypeScript',
                  css: 'CSS',
                  html: 'HTML',
                  json: 'JSON',
                },
              }),
              diffSourcePlugin({
                viewMode: 'rich-text',
                diffMarkdown: value || '',
              }),
            ]}
            markdown={value || ''}
            onChange={onChange}
            placeholder="Enter your prompt in Markdown format"
            contentEditableClassName="prose max-w-full"
          />
        </Box>
      </FormControl>
    </Box>
  );
};
