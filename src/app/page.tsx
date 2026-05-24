'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { Footer } from '@/components/Footer';
import { LanguageToggle } from '@/components/LanguageToggle';
import { logAuditEvent } from '@/lib/supabase';

export default function LandingPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    logAuditEvent(null, 'notification_sent', { page: 'landing' });
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* SMS Notification Banner */}
      {showBanner && (
        <div className="bg-[#1A1A2E] text-white px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
            <p className="text-sm flex-1 leading-snug">
              📱 {t('sms_banner')}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => { setShowBanner(false); router.push('/eligibility'); }}
                className="text-[#3333FF] bg-white text-xs font-semibold px-3 py-1 rounded-full hover:bg-gray-100 transition-colors whitespace-nowrap"
              >
                {t('sms_access')}
              </button>
              <button
                onClick={() => setShowBanner(false)}
                className="text-white/60 hover:text-white text-xl leading-none pb-0.5"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#E0E0E0]">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoMark />
            <span className="font-bold text-[#1A1A2E] text-lg">MaPoste</span>
          </div>
          <LanguageToggle />
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-8 flex flex-col">
        {/* Hero */}
        <div className="text-center mb-8 animate-fadeIn">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#3333FF]/10 mb-4">
            <span className="text-4xl">🎓</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1A1A2E] mb-3">
            {t('landing_headline')}
          </h1>
          <p className="text-[#1A1A2E]/60 text-base leading-relaxed">
            {t('landing_subtext')}
          </p>
        </div>

        {/* Records card */}
        <div className="bg-[#F5F5F5] rounded-xl p-4 mb-6">
          <p className="text-xs text-[#1A1A2E]/50 font-medium uppercase tracking-wide mb-3">
            {t('elig_records_found')}
          </p>
          <div className="space-y-3">
            <InstitutionItem
              name="Université Félix Houphouët-Boigny"
              detail="Licence en Informatique · 2023"
              icon="🎓"
            />
            <InstitutionItem
              name="DECO"
              detail="Baccalauréat Série C · 2019"
              icon="📜"
            />
          </div>
        </div>

        {/* Feature chips */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: '🔒', label: 'PDF signé' },
            { icon: '📱', label: 'QR vérifié' },
            { icon: '🔗', label: 'Partageable' },
          ].map((f, i) => (
            <div key={i} className="bg-[#F5F5F5] rounded-xl p-3 text-center">
              <div className="text-xl mb-1">{f.icon}</div>
              <p className="text-xs text-[#1A1A2E]/60 leading-tight">{f.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-auto">
          <button
            onClick={() => router.push('/eligibility')}
            className="w-full bg-[#3333FF] hover:bg-[#2222CC] text-white font-semibold py-4 rounded-xl text-base transition-colors"
          >
            {t('landing_cta')}
          </button>
          <p className="text-center text-xs text-[#1A1A2E]/40 mt-3">
            {t('landing_service_note')}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function InstitutionItem({ name, detail, icon }: { name: string; detail: string; icon: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-xl shadow-sm shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-[#1A1A2E]">{name}</p>
        <p className="text-xs text-[#1A1A2E]/50">{detail}</p>
      </div>
    </div>
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
