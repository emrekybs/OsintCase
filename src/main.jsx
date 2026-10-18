import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { I18nProvider, useI18n } from './i18n/index.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { UiPrefsProvider } from './context/UiPrefsContext.jsx';
import { ProjectProvider } from './context/ProjectContext.jsx';
import { AppConfigProvider } from './context/AppConfigContext.jsx';
import { CustomIconsProvider } from './context/CustomIconsContext.jsx';
import '@fontsource/chakra-petch/500.css';
import '@fontsource/chakra-petch/600.css';
import '@fontsource/chakra-petch/700.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './styles/themes.css';
import './styles/global.css';
import './styles/case.css';
import './styles/typography.css';
import './styles/refine.css';

// Dil değişince arayüz yeniden kurulur; dosya verisi ProjectProvider'da
// kaldığı için açık dosya kaybolmaz.
function LocalizedApp() {
  const { lang } = useI18n();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return <App key={lang} />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
    <AppConfigProvider>
      <CustomIconsProvider>
        <ThemeProvider>
          <UiPrefsProvider>
            <ProjectProvider>
              <LocalizedApp />
            </ProjectProvider>
          </UiPrefsProvider>
        </ThemeProvider>
      </CustomIconsProvider>
    </AppConfigProvider>
    </I18nProvider>
  </StrictMode>,
);
