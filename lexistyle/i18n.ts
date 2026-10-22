import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n.use(initReactI18next).init({
  fallbackLng: "en",
  lng: "ko",
  debug: process.env.NODE_ENV === "development",
  interpolation: {
    escapeValue: false, // react already escapes by default
  },
  // For Next.js, we'll load translations from public/locales
  // but in this config, we can define our namespaces
  ns: ["common"],
  defaultNS: "common",
});

export default i18n;