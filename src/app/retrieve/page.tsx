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

type Screen = 'progress' | 'review' | 'check';

interface FetchState {
  institution: string;
  status: 'pending' | 'done' | 'error';
}

export default function RetrievePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('progress');
  const [records, setRecords] = useState<AcademicRecord[]>([]);
  const [fetchStates, setFetchStates] = useState<FetchState[]>([]);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagText, setFlagText] = useState('');
  const [flagDone, setFlagDone] = useState(false);

  useEffect(() => {
    const { citizenId } = getSession();
    if (!citizenId) { router.push('/eligibility'); return; }

    supabase
      .from('academic_records')
      .select('*')
      .eq('citizen_id', citizenId)
      .eq('status', 'available')
      .then(({ data }) => {
        const recs = (data as AcademicRecord[]) ?? [];
        setRecords(recs);

        const institutions = [...new Set(recs.map((r) => r.institution))];
        const states: FetchState[] = institutions.map((inst) => ({
          institution: inst,
          status: 'pending',
        }));
        setFetchStates(states);

        // Simulate progressive fetching
        institutions.forEach((inst, i) => {
          setTimeout(() => {
            setFetchStates((prev) =>
              prev.map((s) => (s.institution === inst ? { ...s, status: 'done' } : s))
            );
            if (i === institutions.length - 1) {
              setTimeout(() => setScreen('review'), 600);
            }
          }, 1200 + i * 800);
        });
      });
  }, [router]);

  async function handleConfirm() {
    const { citizenId } = getSession();
    await logAuditEvent(citizenId, 'records_retrieved', {
      record_ids: records.map((r) => r.id),
    });
    setScreen('check');
  }

  const totalFee = records.length * 1000;

  return (
    <div className="min-h-screen flex flex-col">
      <Header showBack onBack={() => screen === 'check' ? setScreen('review') : screen === 'review' ? setScreen('progress') : router.push('/consent')} />
      <ProgressBar currentStep={4} />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">

        {/* Screen: Progress */}
        {screen === 'progress' && (
          <div className="animate-fadeIn">
            <h1 className="text-xl font-bold text-[#1A1A2E] mb-6">{t('retrieve_title')}</h1>

            <div className="space-y-3">
              <ProgressStep
                label={t('retrieve_step_consent')}
                status="done"
              />
              {fetchStates.map((fs) => (
                <ProgressStep
                  key={fs.institution}
                  label={t('retrieve_step_fetching', { institution: fs.institution })}
                  status={fs.status}
                />
              ))}
              <ProgressStep label={t('retrieve_step_review')} status="waiting" />
              <ProgressStep label={t('retrieve_step_payment')} status="waiting" />
              <ProgressStep label={t('retrieve_step_sign')} status="waiting" />
            </div>
          </div>
        )}

        {/* Screen: Review */}
        {screen === 'review' && (
          <div className="animate-fadeIn">
            <h1 className="text-xl font-bold text-[#1A1A2E] mb-1">{t('retrieve_review_title')}</h1>
            <p className="text-sm text-[#1A1A2E]/60 mb-5">{t('retrieve_review_subtitle')}</p>

            <div className="space-y-4 mb-5">
              {records.map((rec) => (
                <RecordReviewCard key={rec.id} record={rec} />
              ))}
            </div>

            {/* Flag error */}
            <button
              onClick={() => setFlagOpen(!flagOpen)}
              className="text-sm text-[#3333FF] font-semibold mb-4 flex items-center gap-1"
            >
              <span>⚠️</span> {t('retrieve_flag_error')}
            </button>

            {flagOpen && (
              <div className="bg-[#FFB300]/10 border border-[#FFB300]/30 rounded-xl p-4 mb-4 animate-fadeIn">
                {flagDone ? (
                  <p className="text-sm text-[#1A1A2E]/70 flex items-center gap-2">
                    <span className="text-[#00C853]">✓</span> {t('retrieve_flag_thanks')}
                  </p>
                ) : (
                  <>
                    <textarea
                      value={flagText}
                      onChange={(e) => setFlagText(e.target.value)}
                      placeholder={t('retrieve_flag_placeholder')}
                      className="w-full border border-[#E0E0E0] rounded-lg px-3 py-2 text-sm text-[#1A1A2E] outline-none focus:border-[#3333FF] mb-2 resize-none"
                      rows={3}
                    />
                    <button
                      onClick={() => { setFlagDone(true); setFlagOpen(false); }}
                      disabled={!flagText.trim()}
                      className="text-sm text-white bg-[#FFB300] disabled:opacity-50 px-4 py-2 rounded-lg font-semibold"
                    >
                      {t('retrieve_flag_submit')}
                    </button>
                  </>
                )}
              </div>
            )}

            <button
              onClick={handleConfirm}
              className="w-full bg-[#3333FF] hover:bg-[#2222CC] text-white font-semibold py-4 rounded-xl text-base transition-colors"
            >
              {t('retrieve_confirm')}
            </button>
          </div>
        )}

        {/* Screen: Check before paying */}
        {screen === 'check' && (
          <div className="animate-fadeIn">
            <h1 className="text-xl font-bold text-[#1A1A2E] mb-1">{t('retrieve_check_title')}</h1>

            <div className="bg-[#F5F5F5] rounded-xl overflow-hidden mb-5 mt-5">
              <div className="px-4 py-3 border-b border-[#E0E0E0] flex items-center justify-between">
                <span className="text-sm text-[#1A1A2E]/60">{t('retrieve_records_selected')}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#1A1A2E]">{records.length}</span>
                  <button
                    onClick={() => setScreen('review')}
                    className="text-xs text-[#3333FF] font-semibold"
                  >
                    {t('change')}
                  </button>
                </div>
              </div>
              {records.map((rec) => (
                <div key={rec.id} className="px-4 py-3 border-b border-[#E0E0E0] last:border-0">
                  <p className="text-sm font-semibold text-[#1A1A2E]">{rec.institution}</p>
                  <p className="text-xs text-[#1A1A2E]/50">
                    {rec.field_of_study ?? rec.record_type} · {rec.year_awarded}
                  </p>
                </div>
              ))}
              <div className="px-4 py-3 bg-[#3333FF]/5 flex items-center justify-between">
                <span className="text-sm font-semibold text-[#1A1A2E]">{t('retrieve_total_fee')}</span>
                <span className="text-lg font-bold text-[#3333FF]">{totalFee.toLocaleString()} FCFA</span>
              </div>
            </div>

            <button
              onClick={() => router.push('/payment')}
              className="w-full bg-[#3333FF] hover:bg-[#2222CC] text-white font-semibold py-4 rounded-xl text-base transition-colors"
            >
              {t('retrieve_continue_payment')}
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

function ProgressStep({ label, status }: { label: string; status: 'done' | 'pending' | 'waiting' | 'error' }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
        status === 'done' ? 'bg-[#00C853]' :
        status === 'pending' ? 'bg-[#3333FF]/10' :
        status === 'error' ? 'bg-[#E8533F]/10' :
        'bg-[#F5F5F5]'
      }`}>
        {status === 'done' && (
          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
            <path d="M1 5L4.5 8.5L11 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        {status === 'pending' && (
          <span className="w-3 h-3 border-2 border-[#3333FF]/30 border-t-[#3333FF] rounded-full animate-spin block" />
        )}
        {status === 'waiting' && (
          <span className="w-2 h-2 rounded-full bg-[#1A1A2E]/20 block" />
        )}
        {status === 'error' && (
          <span className="text-[#E8533F] text-xs font-bold">!</span>
        )}
      </div>
      <p className={`text-sm ${
        status === 'done' ? 'text-[#1A1A2E]' :
        status === 'pending' ? 'text-[#3333FF] font-semibold' :
        'text-[#1A1A2E]/40'
      }`}>
        {label}
      </p>
    </div>
  );
}

function RecordReviewCard({ record }: { record: AcademicRecord }) {
  return (
    <div className="border-2 border-[#E0E0E0] rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-semibold text-sm text-[#1A1A2E] leading-tight">{record.institution}</p>
        <span className="text-[#00C853] text-xs font-semibold whitespace-nowrap flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00C853] inline-block" />
          Récupéré
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {record.field_of_study && (
          <>
            <span className="text-[#1A1A2E]/50">Diplôme</span>
            <span className="text-[#1A1A2E] font-medium">{record.field_of_study}</span>
          </>
        )}
        {record.year_awarded && (
          <>
            <span className="text-[#1A1A2E]/50">Année</span>
            <span className="text-[#1A1A2E] font-medium">{record.year_awarded}</span>
          </>
        )}
        {record.mention && (
          <>
            <span className="text-[#1A1A2E]/50">Mention</span>
            <span className="text-[#1A1A2E] font-medium">{record.mention}</span>
          </>
        )}
      </div>
    </div>
  );
}
