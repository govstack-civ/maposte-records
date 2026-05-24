'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { LanguageToggle } from '@/components/LanguageToggle';
import { supabase, logAuditEvent } from '@/lib/supabase';
import { getSession, clearSession } from '@/lib/session';
import type { Credential, AcademicRecord, SharingEvent, AuditEvent, Citizen } from '@/lib/types';

type Tab = 'credentials' | 'history' | 'audit' | 'settings';

interface FullCredential extends Credential {
  academic_records: AcademicRecord;
  share_count?: number;
}

interface FullSharingEvent extends SharingEvent {
  credentials: Credential & { academic_records: AcademicRecord };
}

const AUDIT_LABELS: Record<string, { en: string; fr: string }> = {
  notification_sent: { en: 'Notification sent', fr: 'Notification envoyée' },
  eligibility_checked: { en: 'Eligibility checked', fr: 'Éligibilité vérifiée' },
  authenticated: { en: 'Successfully signed in', fr: 'Connexion réussie' },
  consent_granted: { en: 'Consent granted', fr: 'Consentement accordé' },
  records_retrieved: { en: 'Records retrieved', fr: 'Relevés récupérés' },
  payment_completed: { en: 'Payment completed', fr: 'Paiement effectué' },
  credential_issued: { en: 'Credential issued', fr: 'Attestation émise' },
  credential_shared: { en: 'Credential shared', fr: 'Attestation partagée' },
  access_revoked: { en: 'Access revoked', fr: 'Accès révoqué' },
  locker_accessed: { en: 'Locker accessed', fr: 'Coffre-fort consulté' },
};

export default function LockerPage() {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('credentials');
  const [citizen, setCitizen] = useState<Citizen | null>(null);
  const [credentials, setCredentials] = useState<FullCredential[]>([]);
  const [sharingEvents, setSharingEvents] = useState<FullSharingEvent[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [updateText, setUpdateText] = useState('');
  const [updateDone, setUpdateDone] = useState(false);

  const loadData = useCallback(async () => {
    const { citizenId } = getSession();
    if (!citizenId) { router.push('/eligibility'); return; }

    setLoading(true);
    await logAuditEvent(citizenId, 'locker_accessed');

    const [citizenRes, credRes, shareRes, auditRes] = await Promise.all([
      supabase.from('citizens').select('*').eq('id', citizenId).single(),
      supabase.from('credentials').select('*, academic_records(*)').eq('citizen_id', citizenId),
      supabase.from('sharing_events').select('*, credentials(*, academic_records(*))').eq('citizen_id', citizenId).order('shared_at', { ascending: false }),
      supabase.from('audit_log').select('*').eq('citizen_id', citizenId).order('occurred_at', { ascending: false }).limit(50),
    ]);

    if (citizenRes.data) setCitizen(citizenRes.data as Citizen);

    const creds = (credRes.data as FullCredential[]) ?? [];
    const shares = (shareRes.data as FullSharingEvent[]) ?? [];

    // Annotate credentials with share count
    const credsWithCounts = creds.map((c) => ({
      ...c,
      share_count: shares.filter((s) => s.credential_id === c.id && s.status === 'active').length,
    }));
    setCredentials(credsWithCounts);
    setSharingEvents(shares);
    setAuditEvents((auditRes.data as AuditEvent[]) ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleRevoke(shareId: string) {
    const { citizenId } = getSession();
    await supabase.from('sharing_events').update({ status: 'revoked' }).eq('id', shareId);
    await logAuditEvent(citizenId, 'access_revoked', { share_id: shareId });
    loadData();
  }

  const activeCredentials = credentials.filter((c) => c.status === 'active');
  const sharedCount = sharingEvents.filter((s) => s.status === 'active').length;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#3333FF]/20 border-t-[#3333FF] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        {/* Header bar */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-[#1A1A2E]">{t('locker_title')}</h1>
            {citizen && <p className="text-sm text-[#1A1A2E]/50">{citizen.full_name}</p>}
          </div>
          <button
            onClick={() => { clearSession(); router.push('/'); }}
            className="text-xs text-[#E8533F] font-semibold py-1 px-3 border border-[#E8533F]/30 rounded-lg"
          >
            {t('locker_logout')}
          </button>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-[#3333FF]/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-[#3333FF]">{activeCredentials.length}</p>
            <p className="text-xs text-[#1A1A2E]/60">{t('locker_active', { n: '' }).replace('{n}', '')}</p>
          </div>
          <div className="bg-[#00C853]/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-[#00C853]">{sharedCount}</p>
            <p className="text-xs text-[#1A1A2E]/60">{t('locker_shared', { n: '' }).replace('{n}', '')}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#F5F5F5] p-1 rounded-xl mb-5 overflow-x-auto">
          {([
            { id: 'credentials', label: t('locker_tab_credentials') },
            { id: 'history', label: t('locker_tab_history') },
            { id: 'audit', label: t('locker_tab_audit') },
            { id: 'settings', label: t('locker_tab_settings') },
          ] as { id: Tab; label: string }[]).map((t_) => (
            <button
              key={t_.id}
              onClick={() => setTab(t_.id)}
              className={`flex-1 whitespace-nowrap text-xs font-semibold py-2 px-2 rounded-lg transition-all ${
                tab === t_.id
                  ? 'bg-white text-[#3333FF] shadow-sm'
                  : 'text-[#1A1A2E]/50 hover:text-[#1A1A2E]'
              }`}
            >
              {t_.label}
            </button>
          ))}
        </div>

        {/* Tab: Credentials */}
        {tab === 'credentials' && (
          <div className="space-y-4 animate-fadeIn">
            {credentials.length === 0 ? (
              <div className="text-center py-10 text-[#1A1A2E]/40">
                <span className="text-4xl mb-3 block">📭</span>
                <p className="text-sm">{t('locker_no_credentials')}</p>
                <button
                  onClick={() => router.push('/eligibility')}
                  className="mt-4 text-[#3333FF] text-sm font-semibold"
                >
                  {t('landing_cta')}
                </button>
              </div>
            ) : credentials.map((cred) => (
              <CredentialCard
                key={cred.id}
                credential={cred}
                onShare={() => router.push('/share')}
                onDownload={() => handleCredentialDownload(cred, citizen)}
                shareLabel={t('locker_action_share')}
                downloadLabel={t('locker_action_download')}
                activeLabel={t('locker_status_active')}
                revokedLabel={t('locker_status_revoked')}
                sharedLabel={t('locker_shared_with', { n: cred.share_count ?? 0 })}
              />
            ))}
            <button
              onClick={() => router.push('/share')}
              className="w-full border-2 border-[#3333FF] text-[#3333FF] font-semibold py-3 rounded-xl text-sm transition-colors hover:bg-[#3333FF]/5"
            >
              + {t('share_title')}
            </button>
          </div>
        )}

        {/* Tab: History */}
        {tab === 'history' && (
          <div className="animate-fadeIn">
            {sharingEvents.length === 0 ? (
              <div className="text-center py-10 text-[#1A1A2E]/40">
                <span className="text-4xl mb-3 block">📋</span>
                <p className="text-sm">{t('locker_no_history')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sharingEvents.map((event) => (
                  <SharingEventCard
                    key={event.id}
                    event={event}
                    onRevoke={() => handleRevoke(event.id)}
                    lang={lang}
                    revokeLabel={t('locker_revoke')}
                    revokedLabel={t('locker_status_revoked')}
                    activeLabel={t('locker_status_active')}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Audit */}
        {tab === 'audit' && (
          <div className="animate-fadeIn">
            {auditEvents.length === 0 ? (
              <div className="text-center py-10 text-[#1A1A2E]/40">
                <span className="text-4xl mb-3 block">📜</span>
                <p className="text-sm">{t('locker_no_audit')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {auditEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 py-3 border-b border-[#F5F5F5] last:border-0">
                    <div className="w-2 h-2 rounded-full bg-[#3333FF] mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1A1A2E]">
                        {AUDIT_LABELS[event.event_type]?.[lang] ?? event.event_type}
                      </p>
                      <p className="text-xs text-[#1A1A2E]/40">
                        {new Date(event.occurred_at).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Settings */}
        {tab === 'settings' && (
          <div className="space-y-5 animate-fadeIn">
            <div className="bg-[#F5F5F5] rounded-xl p-4">
              <p className="text-xs font-semibold text-[#1A1A2E]/50 uppercase tracking-wide mb-3">
                {t('locker_settings_language')}
              </p>
              <LanguageToggle />
            </div>

            {citizen && (
              <div className="bg-[#F5F5F5] rounded-xl overflow-hidden">
                <p className="text-xs font-semibold text-[#1A1A2E]/50 uppercase tracking-wide px-4 pt-4 mb-2">
                  {t('locker_settings_account')}
                </p>
                {[
                  { label: t('locker_settings_nni'), value: citizen.nni },
                  { label: t('locker_settings_name'), value: citizen.full_name },
                  { label: t('locker_settings_phone'), value: citizen.phone ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="px-4 py-3 border-t border-[#E0E0E0]">
                    <p className="text-xs text-[#1A1A2E]/50">{label}</p>
                    <p className="text-sm font-semibold text-[#1A1A2E]">{value}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-[#F5F5F5] rounded-xl p-4">
              <p className="text-xs font-semibold text-[#1A1A2E]/50 uppercase tracking-wide mb-3">
                {t('locker_request_update')}
              </p>
              {updateDone ? (
                <p className="text-sm text-[#00C853] flex items-center gap-2">
                  <span>✓</span> {t('locker_update_thanks')}
                </p>
              ) : (
                <>
                  <textarea
                    value={updateText}
                    onChange={(e) => setUpdateText(e.target.value)}
                    placeholder={t('locker_update_placeholder')}
                    className="w-full border border-[#E0E0E0] rounded-lg px-3 py-2 text-sm text-[#1A1A2E] outline-none focus:border-[#3333FF] mb-2 resize-none"
                    rows={3}
                  />
                  <button
                    onClick={() => { if (updateText.trim()) setUpdateDone(true); }}
                    disabled={!updateText.trim()}
                    className="text-sm text-white bg-[#3333FF] disabled:opacity-50 px-4 py-2 rounded-lg font-semibold"
                  >
                    {t('locker_update_submit')}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

function CredentialCard({
  credential,
  onShare,
  onDownload,
  shareLabel,
  downloadLabel,
  activeLabel,
  revokedLabel,
  sharedLabel,
}: {
  credential: FullCredential;
  onShare: () => void;
  onDownload: () => void;
  shareLabel: string;
  downloadLabel: string;
  activeLabel: string;
  revokedLabel: string;
  sharedLabel: string;
}) {
  return (
    <div className="border border-[#E0E0E0] rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="font-semibold text-sm text-[#1A1A2E]">
              {(credential as FullCredential).academic_records?.institution}
            </p>
            <p className="text-xs text-[#1A1A2E]/50 mt-0.5">
              {(credential as FullCredential).academic_records?.field_of_study} ·{' '}
              {(credential as FullCredential).academic_records?.year_awarded}
            </p>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            credential.status === 'active'
              ? 'bg-[#00C853]/10 text-[#00C853]'
              : 'bg-[#E8533F]/10 text-[#E8533F]'
          }`}>
            {credential.status === 'active' ? activeLabel : revokedLabel}
          </span>
        </div>
        {(credential.share_count ?? 0) > 0 && (
          <p className="text-xs text-[#3333FF] font-medium">{sharedLabel}</p>
        )}
      </div>
      <div className="border-t border-[#E0E0E0] flex">
        <button
          onClick={onShare}
          className="flex-1 py-3 text-sm font-semibold text-[#3333FF] flex items-center justify-center gap-1.5 hover:bg-[#3333FF]/5 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M10 4.5L12 7L10 9.5" stroke="#3333FF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 7H12" stroke="#3333FF" strokeWidth="1.2" strokeLinecap="round"/>
            <circle cx="10" cy="7" r="0" fill="#3333FF"/>
          </svg>
          {shareLabel}
        </button>
        <div className="w-px bg-[#E0E0E0]" />
        <button
          onClick={onDownload}
          className="flex-1 py-3 text-sm font-semibold text-[#1A1A2E]/60 flex items-center justify-center gap-1.5 hover:bg-[#F5F5F5] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2V9M7 9L4.5 6.5M7 9L9.5 6.5" stroke="#1A1A2E" strokeOpacity="0.6" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 11.5H12" stroke="#1A1A2E" strokeOpacity="0.6" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          {downloadLabel}
        </button>
      </div>
    </div>
  );
}

function SharingEventCard({
  event,
  onRevoke,
  lang,
  revokeLabel,
  revokedLabel,
  activeLabel,
}: {
  event: FullSharingEvent;
  onRevoke: () => void;
  lang: 'en' | 'fr';
  revokeLabel: string;
  revokedLabel: string;
  activeLabel: string;
}) {
  const isExpired = event.expires_at ? new Date(event.expires_at) < new Date() : false;
  const isActive = event.status === 'active' && !isExpired;

  return (
    <div className="border border-[#E0E0E0] rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#1A1A2E] truncate">
            {event.recipient_name ?? event.recipient_email}
          </p>
          <p className="text-xs text-[#1A1A2E]/50 truncate">{event.recipient_email}</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
          isActive ? 'bg-[#00C853]/10 text-[#00C853]' : 'bg-[#E0E0E0] text-[#1A1A2E]/50'
        }`}>
          {isActive ? activeLabel : revokedLabel}
        </span>
      </div>
      <p className="text-xs text-[#1A1A2E]/60 mb-1">
        {event.credentials?.academic_records?.field_of_study} — {event.credentials?.academic_records?.institution}
      </p>
      {event.expires_at && (
        <p className="text-xs text-[#1A1A2E]/40 mb-2">
          {lang === 'fr' ? 'Expire' : 'Expires'}: {new Date(event.expires_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB')}
        </p>
      )}
      {isActive && (
        <button
          onClick={onRevoke}
          className="text-xs text-[#E8533F] font-semibold border border-[#E8533F]/30 px-3 py-1 rounded-lg"
        >
          {revokeLabel}
        </button>
      )}
    </div>
  );
}

async function handleCredentialDownload(credential: FullCredential, citizen: Citizen | null) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const record = credential.academic_records;
  const verifyUrl = `${window.location.origin}/verify/${credential.credential_hash}`;

  doc.setFillColor(51, 51, 255);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('MaPoste', 15, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Portail National des Relevés Académiques', 15, 25);

  doc.setTextColor(26, 26, 46);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ATTESTATION ACADÉMIQUE', 105, 50, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 100);
  const details = [
    ['Titulaire', citizen?.full_name ?? ''],
    ['NNI', citizen?.nni ?? ''],
    ['Établissement', record?.institution ?? ''],
    ['Diplôme', record?.field_of_study ?? record?.record_type ?? ''],
    ['Année', String(record?.year_awarded ?? '')],
    ['Mention', record?.mention ?? ''],
    ['ID Attestation', credential.credential_hash],
    ['Date d\'émission', new Date(credential.issued_at).toLocaleDateString('fr-FR')],
  ];
  details.forEach(([label, value], i) => {
    const y = 70 + i * 12;
    doc.text(label + ' :', 20, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 26, 46);
    doc.text(value, 80, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 100);
  });

  doc.setFillColor(240, 240, 255);
  doc.rect(15, 172, 180, 20, 'F');
  doc.setFontSize(9);
  doc.setTextColor(51, 51, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Ce document est cryptographiquement signé / Cryptographically signed', 105, 182, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 140);
  doc.text('Vérifiez sur: ' + verifyUrl, 105, 198, { align: 'center' });

  doc.save(`attestation-${credential.credential_hash}.pdf`);
}
