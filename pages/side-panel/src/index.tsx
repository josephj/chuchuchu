import { createRoot } from 'react-dom/client';
import '@src/index.css';
import SidePanel from '@src/SidePanel';
import { ChakraProvider } from '@chakra-ui/react';

function init() {
  const appContainer = document.querySelector('#app-container');
  if (!appContainer) {
    throw new Error('Can not find #app-container');
  }
  const root = createRoot(appContainer);
  root.render(
    <ChakraProvider>
      <SidePanel />
    </ChakraProvider>,
  );
}

init();
