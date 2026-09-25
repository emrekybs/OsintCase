import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { I18nProvider, useI18n } from './i18n/index.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ProjectProvider } from './context/ProjectContext.jsx';
import { AppConfigProvider } from './context/AppConfigContext.jsx';
import { CustomIconsProvider } from './context/CustomIconsContext.jsx';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/black-ops-one/400.css';
import './styles/themes.css';
import './styles/global.css';
import './styles/case.css';

// Dil değişince arayüz yeniden kurulur; dosya verisi ProjectProvider'da
// kaldığı için açık dosya kaybolmaz.
function LocalizedApp() {
  const { lang } = useI18n();
  return <App key={lang} />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
    <AppConfigProvider>
      <CustomIconsProvider>
        <ThemeProvider>
          <ProjectProvider>
            <LocalizedApp />
          </ProjectProvider>
        </ThemeProvider>
      </CustomIconsProvider>
    </AppConfigProvider>
    </I18nProvider>
  </StrictMode>,
);
