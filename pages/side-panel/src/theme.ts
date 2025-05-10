import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

// Dracula theme colours
const colors = {
  dracula: {
    // Dark theme
    background: '#282a36',
    currentLine: '#44475a',
    foreground: '#f8f8f2',
    comment: '#6272a4',
    cyan: '#8be9fd',
    green: '#50fa7b',
    orange: '#ffb86c',
    pink: '#ff79c6',
    purple: '#bd93f9',
    red: '#ff5555',
    yellow: '#f1fa8c',
    // Light theme
    light: {
      background: '#f8f8f2',
      currentLine: '#e9e9f4',
      foreground: '#282a36',
      comment: '#6272a4',
      selection: '#d7d7e2',
      cyan: '#0095c3',
      green: '#2a9134',
      orange: '#c85000',
      pink: '#d9376e',
      purple: '#7c3aed',
      red: '#dc2626',
      yellow: '#854d0e',
    },
  },
  clearButton: {
    dark: 'dracula.currentLine',
    light: 'dracula.light.currentLine',
  },
};

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
  disableTransitionOnChange: false,
};

export const theme = extendTheme({
  config,
  colors,
  styles: {
    global: (props: { colorMode: 'light' | 'dark' }) => ({
      body: {
        bg: props.colorMode === 'dark' ? 'dracula.background' : 'dracula.light.background',
        color: props.colorMode === 'dark' ? 'dracula.foreground' : 'dracula.light.foreground',
      },
    }),
  },
  components: {
    Alert: {
      baseStyle: {
        container: {
          borderRadius: 'md',
        },
      },
      variants: {
        'left-accent': (props: { colorMode: 'light' | 'dark' }) => ({
          container: {
            bg: props.colorMode === 'dark' ? 'dracula.currentLine' : 'dracula.light.currentLine',
            borderLeftColor: props.colorMode === 'dark' ? 'dracula.red' : 'dracula.light.red',
          },
          icon: {
            color: props.colorMode === 'dark' ? 'dracula.red' : 'dracula.light.red',
          },
          title: {
            color: props.colorMode === 'dark' ? 'dracula.red' : 'dracula.light.red',
          },
          description: {
            color: props.colorMode === 'dark' ? 'dracula.foreground' : 'dracula.light.foreground',
          },
        }),
      },
      defaultProps: {
        variant: 'left-accent',
      },
    },
    Button: {
      variants: {
        solid: (props: { colorMode: 'light' | 'dark' }) => ({
          bg: props.colorMode === 'dark' ? 'dracula.pink' : 'dracula.light.pink',
          color: props.colorMode === 'dark' ? 'white' : 'white',
          _hover: {
            bg: props.colorMode === 'dark' ? 'dracula.red' : 'dracula.light.red',
          },
          _active: {
            bg: props.colorMode === 'dark' ? 'dracula.red' : 'dracula.light.red',
          },
        }),
        ghost: (props: { colorMode: 'light' | 'dark' }) => ({
          _hover: {
            bg: props.colorMode === 'dark' ? 'dracula.currentLine' : 'dracula.light.currentLine',
          },
        }),
      },
      defaultProps: {
        colorScheme: 'blue',
      },
    },
    IconButton: {
      variants: {
        ghost: (props: { colorMode: 'light' | 'dark' }) => ({
          _hover: {
            bg: props.colorMode === 'dark' ? 'dracula.currentLine' : 'dracula.light.currentLine',
          },
        }),
        blackAlpha: (props: { colorMode: 'light' | 'dark' }) => ({
          bg: props.colorMode === 'dark' ? 'dracula.currentLine' : 'dracula.light.currentLine',
          color: 'white',
          _hover: {
            bg: props.colorMode === 'dark' ? 'dracula.red' : 'dracula.light.red',
          },
          _active: {
            bg: props.colorMode === 'dark' ? 'dracula.red' : 'dracula.light.red',
          },
        }),
      },
    },
    Textarea: {
      variants: {
        outline: (props: { colorMode: 'light' | 'dark' }) => ({
          bg: props.colorMode === 'dark' ? 'dracula.currentLine' : 'dracula.light.background',
          borderColor: props.colorMode === 'dark' ? 'dracula.comment' : 'dracula.light.comment',
          _hover: {
            borderColor: props.colorMode === 'dark' ? 'dracula.purple' : 'dracula.light.purple',
          },
          _focus: {
            borderColor: props.colorMode === 'dark' ? 'dracula.purple' : 'dracula.light.purple',
            boxShadow: `0 0 0 1px ${props.colorMode === 'dark' ? colors.dracula.purple : colors.dracula.light.purple}`,
          },
        }),
      },
    },
    Input: {
      baseStyle: {
        field: {
          fontSize: '14px',
        },
      },
      variants: {
        outline: (props: { colorMode: 'light' | 'dark' }) => ({
          field: {
            bg: props.colorMode === 'dark' ? 'dracula.currentLine' : 'dracula.light.background',
            borderColor: props.colorMode === 'dark' ? 'dracula.comment' : 'dracula.light.comment',
            height: '38px',
            _hover: {
              borderColor: props.colorMode === 'dark' ? 'dracula.purple' : 'dracula.light.purple',
            },
            _focus: {
              borderColor: props.colorMode === 'dark' ? 'dracula.purple' : 'dracula.light.purple',
              boxShadow: `0 0 0 1px ${props.colorMode === 'dark' ? colors.dracula.purple : colors.dracula.light.purple}`,
            },
          },
        }),
      },
    },
  },
});
