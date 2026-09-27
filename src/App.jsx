import { useEffect } from 'react';
import { useProject } from './context/ProjectContext.jsx';
import { useAppConfig } from './context/AppConfigContext.jsx';
import Landing from './components/Landing.jsx';
import ProjectView from './components/ProjectView.jsx';
import Welcome from './components/Welcome.jsx';

// Kurulum sihirbazı varsayılan olarak kapalı: site açılınca doğrudan ana
// ekran gelir, harita OpenStreetMap (anahtarsız) olur. Dil tarayıcıdan
// algılanır; analist adı, harita ve anahtarlar ana ekrandan / Ayarlar'dan
// değiştirilebilir. Sihirbazı geri açmak için: VITE_SETUP_WIZARD=1
const SHOW_WIZARD = import.meta.env.VITE_SETUP_WIZARD === '1';

export default function App() {
  const { project } = useProject();
  const { loaded, mapProviderSource, setMapProvider } = useAppConfig();

  const isFirstRun = loaded && mapProviderSource === null;

  useEffect(() => {
    if (isFirstRun && !SHOW_WIZARD) setMapProvider('osm');
  }, [isFirstRun, setMapProvider]);

  // Yapılandırma okunana kadar bir kare boş kal (ekran titremesin).
  if (!loaded) return null;
  if (isFirstRun && SHOW_WIZARD) return <Welcome />;

  return project ? <ProjectView /> : <Landing />;
}
