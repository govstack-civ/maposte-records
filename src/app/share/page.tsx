'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { Header } from '@/components/Header';
import { ProgressBar } from '@/components/ProgressBar';
import { Footer } from '@/components/Footer';
import { supabase, logAuditEvent } from '@/lib/supabase';
import { getSession, getCredentialIds } from '@/lib/session';
import type { Credential, AcademicRecord } from '@/lib/types';

type Screen = 'select' | 'recipient' | 'confirm';
type AccessDuration = '24h' | '7d' | '30d';
type AccessLevel = 'view_only' | 'download';

interface FullCredential extends Credential {
  academic_records: AcademicRecord;
}

export default function SharePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('select');
  const [credentials, setCredentials] = useState<FullCredential[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientOrg, setRecipientOrg] = useState('');
  const [duration, setDuration] = useState<AccessDuration>('7d');
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('view_only');
  const [sharing, setSharing] = useState(false);
  const [shareResult, setShareResult] = useState<{ token: string; expiresAt: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const { citizenId } = getSession();
    if (!citizenId) { router.push('/eligibility'); return; }

    supabase
      .from('credentials')
      .select('*, academic_records(*)')
      .eq('citizen_id', citizenId)
      .eq('status', 'active')
      .then(({ data }) => {
        setCredentials((data as FullCredential[]) ?? []);
      });
  }, [router]);

  function validate() {
    const e: Record<string, string> = {};
    if (!recipientEmail.includes('@')) e.email = 'Email invalide';
    if (!recipientName.trim()) e.name = 'Nom requis';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function getDurationMs(d: AccessDuration) {
    return { '24h': 24 * 3600000, '7d': 7 * 86400000, '30d': 30 * 86400000 }[d];
  }

  function getDurationLabel(d: AccessDuration) {
    return { '24h': t('share_24h'), '7d': t('share_7d'), '30d': t('share_30d') }[d];
  }

  async function handleShare() {
    if (!validate() || !selected) return;
    setSharing(true);

    const { citizenId } = getSession();
    const expiresAt = new Date(Date.now() + getDurationMs(duration)).toISOString();
    const token = `SHARE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    await supabase.from('sharing_events').insert({
      credential_id: selected,
      citizen_id: citizenId,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      recipient_organisation: recipientOrg || null,
      access_level: accessLevel,
      expires_at: expiresAt,
      share_token: token,
      status: 'active',
    });

    await logAuditEvent(citizenId, 'credential_shared', {
      credential_id: selected,
      recipient_email: recipientEmail,
      access_level: accessLevel,
      expires_at: expiresAt,
    });

    setShareResult({ token, expiresAt });
    setSharing(false);
    setScreen('confirm');
  }

  const selectedCred = credentials.find((c) => c.id === selected);

  return (
    <div className="min-h-screen flex flex-col">
      <Header showBack onBack={() => {
        if (screen === 'recipient') setScreen('select');
        else if (screen === 'select') router.push('/locker');
        else router.push('/locker');
      }} />
      <ProgressBar currentStep={7} />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">

        {/* Select credential */}
        {screen === 'select' && (
          <div className="animate-fadeIn">
            <h1 className="text-xl font-bold text-[#1A1A2E] mb-5">{t('share_select_title')}</h1>

            {credentials.length === 0 ? (
              <div className="text-center py-10 text-[#1A1A2E]/40">
                <span className="text-4xl mb-3 block">📭</span>
                <p className="text-sm">{t('locker_no_credentials')}</p>
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                {credentials.map((cred) => (
                  <button
                    key={cred.id}
                    onClick={() => setSelected(cred.id)}
                    className={`w-full text-left flex items-start gap-3 p-4 rounded-xl border-2 transition-all ${
                      selected === cred.id
                        ? 'border-[#3333FF] bg-[#3333FF]/5'
                        : 'border-[#E0E0E0] bg-white'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                      selected === cred.id ? 'border-[#3333FF]' : 'border-[#E0E0E0]'
                    }`}>
                      {selected === cred.id && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#3333FF]" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-[#1A1A2E]">{cred.academic_records?.institution}</p>
                      <p className="text-xs text-[#1A1A2E]/50 mt-0.5">
                        {cred.academic_records?.field_of_study} · {cred.academic_records?.year_awarded}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setScreen('recipient')}
              disabled={!selected}
              className="w-full bg-[#3333FF] hover:bg-[#2222CC] disabled:bg-[#E0E0E0] disabled:text-[#1A1A2E]/40 text-white font-semibold py-4 rounded-xl text-base transition-colors"
            >
              {t('share_choose_recipient')}
            </button>
          </div>
        )}

        {/* Recipient details */}
        {screen === 'recipient' && (
          <div className="animate-fadeIn">
            <h1 className="text-xl font-bold text-[#1A1A2E] mb-1">{t('share_title')}</h1>
            {selectedCred && (
              <p className="text-sm text-[#1A1A2E]/50 mb-5">
                {selectedCred.academic_records?.institution} — {selectedCred.academic_records?.field_of_study}
              </p>
            )}

            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-1">{t('share_recipient_email')}</label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="jp.yao@fonctionpublique.ci"
                  className={`w-full border-2 rounded-xl px-4 py-3 text-sm text-[#1A1A2E] outline-none transition-colors ${
                    errors.email ? 'border-[#E8533F]' : 'border-[#E0E0E0] focus:border-[#3333FF]'
                  }`}
                />
                {errors.email && <p className="text-xs text-[#E8533F] mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-1">{t('share_recipient_name')}</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Jean-Philippe Yao"
                  className={`w-full border-2 rounded-xl px-4 py-3 text-sm text-[#1A1A2E] outline-none transition-colors ${
                    errors.name ? 'border-[#E8533F]' : 'border-[#E0E0E0] focus:border-[#3333FF]'
                  }`}
                />
                {errors.name && <p className="text-xs text-[#E8533F] mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-1">{t('share_recipient_org')}</label>
                <input
                  type="text"
                  value={recipientOrg}
                  onChange={(e) => setRecipientOrg(e.target.value)}
                  placeholder="Ministère de la Fonction Publique"
                  className="w-full border-2 border-[#E0E0E0] focus:border-[#3333FF] rounded-xl px-4 py-3 text-sm text-[#1A1A2E] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-2">{t('share_duration')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['24h', '7d', '30d'] as AccessDuration[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                        duration === d
                          ? 'border-[#3333FF] bg-[#3333FF]/5 text-[#3333FF]'
                          : 'border-[#E0E0E0] text-[#1A1A2E]/60'
                      }`}
                    >
                      {getDurationLabel(d)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-2">{t('share_access_level')}</label>
                <div className="space-y-2">
                  {([
                    { id: 'view_only', label: t('share_view_only') },
                    { id: 'download', label: t('share_view_download') },
                  ] as { id: AccessLevel; label: string }[]).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setAccessLevel(opt.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors ${
                        accessLevel === opt.id
                          ? 'border-[#3333FF] bg-[#3333FF]/5'
                          : 'border-[#E0E0E0]'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        accessLevel === opt.id ? 'border-[#3333FF]' : 'border-[#E0E0E0]'
                      }`}>
                        {accessLevel === opt.id && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#3333FF]" />
                        )}
                      </div>
                      <span className="text-sm font-semibold text-[#1A1A2E]">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleShare}
              disabled={sharing}
              className="w-full bg-[#3333FF] hover:bg-[#2222CC] disabled:bg-[#E0E0E0] disabled:text-[#1A1A2E]/40 text-white font-semibold py-4 rounded-xl text-base transition-colors flex items-center justify-center gap-2"
            >
              {sharing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('share_sending')}
                </>
              ) : t('share_send')}
            </button>
          </div>
        )}

        {/* Confirmation */}
        {screen === 'confirm' && shareResult && selectedCred && (
          <div className="animate-fadeIn text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#00C853]/10 mx-auto mb-3">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="14" stroke="#00C853" strokeWidth="2"/>
                <path d="M9 16L13.5 20.5L23 11" stroke="#00C853" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-[#1A1A2E] mb-1">{t('share_success')}</h1>
            <p className="text-sm text-[#1A1A2E]/50 mb-5">Email envoyé à {recipientEmail}</p>

            <div className="bg-[#F5F5F5] rounded-xl overflow-hidden text-left mb-6">
              {[
                { label: t('share_shared_with'), value: `${recipientName} (${recipientEmail})` },
                { label: 'Relevé', value: `${selectedCred.academic_records?.field_of_study} — ${selectedCred.academic_records?.institution}` },
                { label: t('share_access_expires'), value: new Date(shareResult.expiresAt).toLocaleDateString('fr-FR') },
                { label: t('share_access_level_label'), value: accessLevel === 'view_only' ? t('share_view_only') : t('share_view_download') },
              ].map(({ label, value }) => (
                <div key={label} className="px-4 py-3 border-b border-[#E0E0E0] last:border-0">
                  <p className="text-xs text-[#1A1A2E]/50 mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-[#1A1A2E]">{value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <button
                onClick={() => router.push('/locker')}
                className="w-full bg-[#3333FF] hover:bg-[#2222CC] text-white font-semibold py-4 rounded-xl text-base transition-colors"
              >
                {t('share_go_locker')}
              </button>
              <button
                onClick={() => { setScreen('select'); setSelected(null); setShareResult(null); setRecipientEmail(''); setRecipientName(''); setRecipientOrg(''); }}
                className="w-full border-2 border-[#E0E0E0] text-[#1A1A2E] font-semibold py-4 rounded-xl text-base transition-colors"
              >
                {t('share_another')}
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
