"use client";

import i18n from "../../i18n"; // i18n 설정 파일 import
import { I18nextProvider } from "react-i18next";

interface I18nProviderProps {
  children: React.ReactNode;
  lng: string;
}

export function I18nProvider({ children, lng }: I18nProviderProps) {
  i18n.changeLanguage(lng);
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}