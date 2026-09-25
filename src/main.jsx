import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ProjectProvider } from './context/ProjectContext.jsx';
import { AppConfigProvider } from './context/AppConfigContext.jsx';
import { CustomIconsProvider } from './context/CustomIconsContext.jsx';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './styles/themes.css';
import './styles/global.css';
import './styles/case.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppConfigProvider>
      <CustomIconsProvider>
        <ThemeProvider>
          <ProjectProvider>
            <App />
          </ProjectProvider>
        </ThemeProvider>
      </CustomIconsProvider>
    </AppConfigProvider>
  </StrictMode>,
);
