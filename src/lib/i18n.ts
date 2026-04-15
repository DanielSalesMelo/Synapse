import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Traduções carregadas de arquivos JSON separados
import pt from '../locales/pt.json';
import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import zh from '../locales/zh.json';

// Detecta o idioma do navegador e normaliza para os idiomas suportados
function detectLanguage(): string {
  const saved = localStorage.getItem('i18nextLng');
  if (saved && ['pt', 'en', 'es', 'fr', 'zh'].includes(saved)) {
    return saved;
  }

  const browserLangs = navigator.languages || [navigator.language];
  for (const lang of browserLangs) {
    const lower = lang.toLowerCase();
    if (lower.startsWith('pt')) return 'pt';
    if (lower.startsWith('es')) return 'es';
    if (lower.startsWith('fr')) return 'fr';
    if (lower.startsWith('zh')) return 'zh';
    if (lower.startsWith('en')) return 'en';
  }

  return 'pt'; // Padrão: Português
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: pt },
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      zh: { translation: zh },
    },
    lng: detectLanguage(),
    fallbackLng: 'pt',
    supportedLngs: ['pt', 'en', 'es', 'fr', 'zh'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
  });

export default i18n;
