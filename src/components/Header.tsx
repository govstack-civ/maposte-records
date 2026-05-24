'use client';

import Link from 'next/link';
import { LanguageToggle } from './LanguageToggle';

interface HeaderProps {
  showBack?: boolean;
  onBack?: () => void;
  backHref?: string;
}

export function Header({ showBack, onBack, backHref }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#E0E0E0]">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <>
              {onBack ? (
                <button
                  onClick={onBack}
                  className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#F5F5F5] transition-colors"
                  aria-label="Back"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M12.5 15L7.5 10L12.5 5" stroke="#1A1A2E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              ) : backHref ? (
                <Link
                  href={backHref}
                  className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#F5F5F5] transition-colors"
                  aria-label="Back"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M12.5 15L7.5 10L12.5 5" stroke="#1A1A2E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              ) : null}
            </>
          )}
          <Link href="/" className="flex items-center gap-2">
            <LogoMark />
            <span className="font-bold text-[#1A1A2E] text-lg">MaPoste</span>
          </Link>
        </div>
        <LanguageToggle />
      </div>
    </header>
  );
}

function LogoMark() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#3333FF] flex items-center justify-center">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 2L15 5.5V12.5L9 16L3 12.5V5.5L9 2Z" fill="white" opacity="0.9"/>
        <path d="M9 5L12.5 7V11L9 13L5.5 11V7L9 5Z" fill="#3333FF"/>
        <circle cx="9" cy="9" r="1.5" fill="white"/>
      </svg>
    </div>
  );
}
