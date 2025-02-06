import { createRoot } from 'react-dom/client';
import '@src/index.css';
// import '@extension/ui/dist/global.css';
import Options from '@src/Options';
import { ChakraProvider } from '@chakra-ui/react';
import { theme } from '../../side-panel/src/theme';

function init() {
  const appContainer = document.querySelector('#app-container');
  if (!appContainer) {
    throw new Error('Can not find #app-container');
  }
  const root = createRoot(appContainer);
  root.render(
    <ChakraProvider theme={theme}>
      <Options />
    </ChakraProvider>,
  );
}

init();
