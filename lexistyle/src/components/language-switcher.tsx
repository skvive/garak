"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

const LANGUAGES = [
  { code: "ko", label: "한국어" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
  { code: "ms", label: "Bahasa Melayu" },
  { code: "th", label: "ไทย" },
  { code: "vi", label: "Tiếng Việt" },
];

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Extract current language from pathname
  const currentLang = (() => {
    const segments = pathname.split("/");
    if (segments.length >= 3) {
      const firstSegment = segments[2];
      if (LANGUAGES.some((l) => l.code === firstSegment)) return firstSegment;
    }
    return "ko"; // default
  })();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-lang-switcher]")) setIsOpen(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleSelect = (code: string) => {
    setIsOpen(false);
    // Build new path by replacing the language segment
    const newPath = "/" + code + pathname.slice(3); // remove old lang, prepend new
    router.push(newPath);
  };

  const currentLabel = LANGUAGES.find((l) => l.code === currentLang)?.label ?? "한국어";

  return (
    <div className="relative" data-lang-switcher>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-1 rounded-lg border border-line bg-paper px-2 py-1 text-[12px] font-medium text-ink hover:bg-fog"
        aria-label="언어 선택"
      >
        {currentLabel}
        <ChevronDown className="size-3 text-dim" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 min-w-[100px] overflow-hidden rounded-lg border border-line bg-paper shadow-lg">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`block w-full px-3 py-2 text-left text-[13px] transition-colors ${
                lang.code === currentLang
                  ? "bg-fog-deep font-semibold text-coral"
                  : "text-ink hover:bg-fog"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
