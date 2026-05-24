'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { Header } from '@/components/Header';
import { ProgressBar } from '@/components/ProgressBar';
import { Footer } from '@/components/Footer';
import { supabase, logAuditEvent } from '@/lib/supabase';
import { getSession } from '@/lib/session';
import type { AcademicRecord } from '@/lib/types';

interface InstitutionOption {
  name: string;
  records: AcademicRecord[];
  selected: boolean;
}

export default function ConsentPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [rightsOpen, setRightsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const { citizenId } = getSession();
    if (!citizenId) { router.push('/eligibility'); return; }

    supabase
      .from('academic_records')
      .select('*')
      .eq('citizen_id', citizenId)
      .eq('status', 'available')
      .then(({ data }) => {
        const records = (data as AcademicRecord[]) ?? [];
        const grouped = records.reduce<Record<string, AcademicRecord[]>>((acc, r) => {
          acc[r.institution] = [...(acc[r.institution] ?? []), r];
          return acc;
        }, {});
        setInstitutions(
          Object.entries(grouped).map(([name, recs]) => ({ name, records: recs, selected: true }))
        );
        setLoaded(true);
      });
  }, [router]);

  function toggleInstitution(name: string) {
    setInstitutions((prev) =>
      prev.map((i) => (i.name === name ? { ...i, selected: !i.selected } : i))
    );
  }

  async function handleAuthorise() {
    const selected = institutions.filter((i) => i.selected);
    if (selected.length === 0) return;

    setSaving(true);
    const { citizenId } = getSession();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await supabase.from('consent_records').insert({
      citizen_id: citizenId,
      institutions_consented: selected.map((i) => i.name),
      scope: 'academic_records',
      expires_at: expiresAt,
    });

    await logAuditEvent(citizenId, 'consent_granted', {
      institutions: selected.map((i) => i.name),
      expires_at: expiresAt,
    });

    router.push('/retrieve');
  }

  if (!loaded) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header showBack backHref="/auth" />
        <ProgressBar currentStep={3} />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#3333FF]/20 border-t-[#3333FF] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const anySelected = institutions.some((i) => i.selected);

  return (
    <div className="min-h-screen flex flex-col">
      <Header showBack backHref="/auth" />
      <ProgressBar currentStep={3} />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        <h1 className="text-xl font-bold text-[#1A1A2E] mb-3">{t('consent_title')}</h1>

        {/* Explanation */}
        <div className="bg-[#3333FF]/10 border border-[#3333FF]/20 rounded-xl p-4 mb-5">
          <p className="text-sm text-[#1A1A2E]/80 mb-2">{t('consent_explanation')}</p>
          <p className="text-sm text-[#1A1A2E]/80">{t('consent_explanation_2')}</p>
        </div>

        {/* Institution checkboxes */}
        <p className="text-sm font-semibold text-[#1A1A2E] mb-3">{t('consent_select')}</p>
        <div className="space-y-3 mb-4">
          {institutions.map((inst) => (
            <button
              key={inst.name}
              onClick={() => toggleInstitution(inst.name)}
              className={`w-full text-left flex items-start gap-3 p-4 rounded-xl border-2 transition-all ${
                inst.selected
                  ? 'border-[#3333FF] bg-[#3333FF]/5'
                  : 'border-[#E0E0E0] bg-white'
              }`}
            >
              <div
                className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  inst.selected ? 'bg-[#3333FF]' : 'bg-white border-2 border-[#E0E0E0]'
                }`}
              >
                {inst.selected && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-[#1A1A2E]">{inst.name}</p>
                {inst.records.map((r) => (
                  <p key={r.id} className="text-xs text-[#1A1A2E]/50 mt-0.5">
                    {r.field_of_study ?? r.record_type} · {r.year_awarded}
                  </p>
                ))}
              </div>
            </button>
          ))}
        </div>

        {/* Duration */}
        <div className="flex items-center gap-2 bg-[#FFB300]/10 border border-[#FFB300]/30 rounded-xl px-4 py-3 mb-5">
          <span className="text-lg">⏱</span>
          <p className="text-sm text-[#1A1A2E]/70">{t('consent_duration')}</p>
        </div>

        {/* Rights accordion */}
        <button
          onClick={() => setRightsOpen(!rightsOpen)}
          className="w-full flex items-center justify-between bg-[#F5F5F5] rounded-xl px-4 py-3 mb-2 text-left"
        >
          <span className="text-sm font-semibold text-[#1A1A2E]">{t('consent_rights_title')}</span>
          <svg
            width="20" height="20" viewBox="0 0 20 20" fill="none"
            className={`transition-transform ${rightsOpen ? 'rotate-180' : ''}`}
          >
            <path d="M5 7.5L10 12.5L15 7.5" stroke="#1A1A2E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {rightsOpen && (
          <div className="bg-[#F5F5F5] rounded-xl px-4 pb-4 -mt-1 mb-5 animate-fadeIn">
            <ul className="space-y-2 pt-2">
              {[t('consent_right_1'), t('consent_right_2'), t('consent_right_3'), t('consent_right_4')].map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#1A1A2E]/70">
                  <span className="text-[#3333FF] font-bold mt-0.5">•</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTAs */}
        <div className="space-y-3 mt-4">
          <button
            onClick={handleAuthorise}
            disabled={!anySelected || saving}
            className="w-full bg-[#3333FF] hover:bg-[#2222CC] disabled:bg-[#E0E0E0] disabled:text-[#1A1A2E]/40 text-white font-semibold py-4 rounded-xl text-base transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('consent_saving')}
              </>
            ) : t('consent_authorise')}
          </button>
          {institutions.some((i) => i.selected) && institutions.some((i) => !i.selected) === false && (
            <p className="text-xs text-center text-[#1A1A2E]/40">{t('consent_partial')} — {t('cancel').toLowerCase()} some above</p>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
