import { createRoot } from 'react-dom/client';
import Options from '@src/Options';
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import { theme, ColorModeManager } from '@extension/shared';

function init() {
  const appContainer = document.querySelector('#app-container');
  if (!appContainer) {
    throw new Error('Can not find #app-container');
  }
  const root = createRoot(appContainer);
  root.render(
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <ColorModeManager />
      <Options />
    </ChakraProvider>,
  );
}

init();
