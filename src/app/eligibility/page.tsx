'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { Header } from '@/components/Header';
import { ProgressBar } from '@/components/ProgressBar';
import { Footer } from '@/components/Footer';
import { supabase, logAuditEvent } from '@/lib/supabase';
import { setSession } from '@/lib/session';
import type { AcademicRecord, Citizen } from '@/lib/types';

interface EligibilityResult {
  citizen: Citizen;
  records: AcademicRecord[];
}

export default function EligibilityPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [nni, setNni] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [nniError, setNniError] = useState('');
  const [queryError, setQueryError] = useState('');
  const [infoOpen, setInfoOpen] = useState(false);

  async function handleCheck() {
    if (nni.replace(/\s/g, '').length !== 11 || !/^\d+$/.test(nni.replace(/\s/g, ''))) {
      setNniError(t('elig_nni_error'));
      return;
    }
    setNniError('');
    setQueryError('');
    setLoading(true);
    setNotFound(false);

    const clean = nni.replace(/\s/g, '');
    const { data: citizens, error: citizenError } = await supabase
      .from('citizens')
      .select('*')
      .eq('nni', clean)
      .limit(1);

    if (citizenError) {
      setQueryError(citizenError.message);
      setLoading(false);
      return;
    }

    if (!citizens || citizens.length === 0) {
      await logAuditEvent(null, 'eligibility_checked', { nni: clean, result: 'not_found' });
      setNotFound(true);
      setLoading(false);
      return;
    }

    const citizen = citizens[0] as Citizen;
    const { data: records, error: recordsError } = await supabase
      .from('academic_records')
      .select('*')
      .eq('citizen_id', citizen.id)
      .eq('status', 'available');

    if (recordsError) {
      setQueryError(recordsError.message);
      setLoading(false);
      return;
    }

    await logAuditEvent(citizen.id, 'eligibility_checked', {
      nni: clean,
      result: 'found',
      records_count: records?.length ?? 0,
    });

    setSession(citizen.id, clean);
    setResult({ citizen, records: records as AcademicRecord[] ?? [] });
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header showBack backHref="/" />
      <ProgressBar currentStep={1} />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        {!result && !notFound && (
          <div className="animate-fadeIn">
            {/* Service info accordion */}
            <button
              onClick={() => setInfoOpen(!infoOpen)}
              className="w-full flex items-center justify-between bg-[#F5F5F5] rounded-xl px-4 py-3 mb-4 text-left"
            >
              <span className="font-semibold text-[#1A1A2E] text-sm">{t('elig_what_is')}</span>
              <svg
                width="20" height="20" viewBox="0 0 20 20" fill="none"
                className={`transition-transform ${infoOpen ? 'rotate-180' : ''}`}
              >
                <path d="M5 7.5L10 12.5L15 7.5" stroke="#1A1A2E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {infoOpen && (
              <div className="bg-[#F5F5F5] rounded-xl px-4 pb-4 -mt-2 mb-4 animate-fadeIn">
                <p className="text-sm text-[#1A1A2E]/70 mb-3">{t('elig_description')}</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <InfoCard icon="⏱" label={t('elig_time')} value={t('elig_time_value')} />
                  <InfoCard icon="💰" label={t('elig_cost')} value={t('elig_cost_value')} />
                </div>
                <p className="text-xs font-semibold text-[#1A1A2E] mb-2">{t('elig_what_you_get')}</p>
                <ul className="space-y-1">
                  {[t('elig_get_1'), t('elig_get_2'), t('elig_get_3')].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[#1A1A2E]/70">
                      <span className="text-[#00C853] mt-0.5">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <h1 className="text-xl font-bold text-[#1A1A2E] mb-2">{t('elig_title')}</h1>
            <p className="text-sm text-[#1A1A2E]/60 mb-5">{t('elig_description').substring(0, 80)}...</p>

            {queryError && (
              <div className="bg-[#E8533F]/10 border border-[#E8533F]/30 rounded-xl p-3 mb-4">
                <p className="text-xs font-semibold text-[#E8533F] mb-1">Database error</p>
                <p className="text-xs text-[#1A1A2E]/70 font-mono break-all">{queryError}</p>
              </div>
            )}

            <label className="block text-sm font-semibold text-[#1A1A2E] mb-2">
              {t('elig_enter_nni')}
            </label>
            <input
              type="tel"
              inputMode="numeric"
              value={nni}
              onChange={(e) => {
                setNni(e.target.value.replace(/\D/g, '').slice(0, 11));
                setNniError('');
              }}
              placeholder={t('elig_nni_placeholder')}
              className={`w-full border-2 rounded-xl px-4 py-3 text-lg font-mono tracking-widest text-center text-[#1A1A2E] bg-white outline-none transition-colors ${
                nniError ? 'border-[#E8533F]' : 'border-[#E0E0E0] focus:border-[#3333FF]'
              }`}
              maxLength={11}
              onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
            />
            {nniError && (
              <p className="text-sm text-[#E8533F] mt-1">{nniError}</p>
            )}
            <p className="text-xs text-[#1A1A2E]/40 mt-2 text-center">
              {nni.length}/11
            </p>

            <button
              onClick={handleCheck}
              disabled={loading || nni.length !== 11}
              className="w-full mt-5 bg-[#3333FF] hover:bg-[#2222CC] disabled:bg-[#E0E0E0] disabled:text-[#1A1A2E]/40 text-white font-semibold py-4 rounded-xl text-base transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('elig_checking')}
                </>
              ) : t('elig_check')}
            </button>
          </div>
        )}

        {notFound && (
          <div className="animate-fadeIn">
            <div className="bg-[#E8533F]/10 border border-[#E8533F]/30 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">❌</span>
                <h2 className="font-bold text-[#E8533F]">{t('elig_not_found')}</h2>
              </div>
              <p className="text-sm text-[#1A1A2E]/70">{t('elig_not_found_detail')}</p>
            </div>

            <div className="bg-[#F5F5F5] rounded-xl p-4 mb-6">
              <p className="text-sm font-semibold text-[#1A1A2E] mb-3">{t('elig_next_steps')}</p>
              <ul className="space-y-2">
                {[t('elig_next_1'), t('elig_next_2'), t('elig_next_3')].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#1A1A2E]/70">
                    <span className="text-[#3333FF] font-bold mt-0.5">{i + 1}.</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => { setNotFound(false); setNni(''); }}
              className="w-full bg-[#3333FF] hover:bg-[#2222CC] text-white font-semibold py-4 rounded-xl text-base transition-colors"
            >
              {t('retry')}
            </button>
          </div>
        )}

        {result && (
          <div className="animate-fadeIn">
            <div className="bg-[#00C853]/10 border border-[#00C853]/30 rounded-xl p-4 mb-5">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">✅</span>
                <div>
                  <h2 className="font-bold text-[#00C853]">
                    {t('elig_eligible', { count: result.records.length })}
                  </h2>
                  <p className="text-sm text-[#1A1A2E]/60">{result.citizen.full_name}</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-xs text-[#1A1A2E]/50 font-medium uppercase tracking-wide mb-3">
                {t('elig_records_found')}
              </p>
              <div className="space-y-3">
                {result.records.map((rec) => (
                  <RecordCard key={rec.id} record={rec} />
                ))}
              </div>
            </div>

            <button
              onClick={() => router.push('/auth')}
              className="w-full bg-[#3333FF] hover:bg-[#2222CC] text-white font-semibold py-4 rounded-xl text-base transition-colors"
            >
              {t('continue')}
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg p-3">
      <p className="text-xs text-[#1A1A2E]/50 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-[#1A1A2E]">{icon} {value}</p>
    </div>
  );
}

function RecordCard({ record }: { record: AcademicRecord }) {
  return (
    <div className="bg-[#F5F5F5] rounded-xl p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-xl shadow-sm shrink-0 mt-0.5">
        {record.record_type === 'degree' ? '🎓' : '📜'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-[#1A1A2E] leading-tight">{record.institution}</p>
        <p className="text-xs text-[#1A1A2E]/60 mt-0.5">
          {record.field_of_study ?? record.record_type} · {record.year_awarded}
        </p>
        {record.mention && (
          <p className="text-xs text-[#1A1A2E]/50">{record.mention}</p>
        )}
      </div>
      <span className="text-[#00C853] text-xs font-semibold shrink-0">✓</span>
    </div>
  );
}
