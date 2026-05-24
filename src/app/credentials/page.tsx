'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { Header } from '@/components/Header';
import { ProgressBar } from '@/components/ProgressBar';
import { Footer } from '@/components/Footer';
import { supabase, logAuditEvent } from '@/lib/supabase';
import { getSession, setCredentialIds } from '@/lib/session';
import type { AcademicRecord, Credential } from '@/lib/types';
import { QRCodeSVG } from 'qrcode.react';

type Screen = 'declare' | 'issued';

export default function CredentialsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('declare');
  const [records, setRecords] = useState<AcademicRecord[]>([]);
  const [citizen, setCitizen] = useState<{ full_name: string; nni: string } | null>(null);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [signing, setSigning] = useState(false);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const { citizenId } = getSession();
    if (!citizenId) { router.push('/eligibility'); return; }

    Promise.all([
      supabase.from('citizens').select('full_name, nni').eq('id', citizenId).single(),
      supabase.from('academic_records').select('*').eq('citizen_id', citizenId).eq('status', 'available'),
    ]).then(([citizenRes, recordsRes]) => {
      if (citizenRes.data) setCitizen(citizenRes.data as { full_name: string; nni: string });
      if (recordsRes.data) setRecords(recordsRes.data as AcademicRecord[]);
    });
  }, [router]);

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setOtpError('');
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleSign() {
    const code = otp.join('');
    if (code.length !== 6) return;

    setSigning(true);
    const { citizenId, nni } = getSession();

    await new Promise((r) => setTimeout(r, 1500));

    // Issue credentials for each record
    const issuedCredentials: Credential[] = [];
    for (const record of records) {
      const hash = `CRED-${record.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      const { data } = await supabase.from('credentials').insert({
        citizen_id: citizenId,
        record_id: record.id,
        credential_hash: hash,
        qr_code_url: `/verify/${hash}`,
        status: 'active',
      }).select('*').single();

      if (data) issuedCredentials.push(data as Credential);
    }

    setCredentials(issuedCredentials);
    setCredentialIds(issuedCredentials.map((c) => c.id));

    await logAuditEvent(citizenId, 'credential_issued', {
      credential_ids: issuedCredentials.map((c) => c.id),
      nni,
    });

    setSigning(false);
    setScreen('issued');
  }

  const otpFilled = otp.every((d) => d !== '');

  return (
    <div className="min-h-screen flex flex-col">
      <Header showBack onBack={() => screen === 'issued' ? undefined : router.push('/payment')} />
      <ProgressBar currentStep={screen === 'issued' ? 7 : 6} />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">

        {/* Declaration */}
        {screen === 'declare' && citizen && (
          <div className="animate-fadeIn">
            <h1 className="text-xl font-bold text-[#1A1A2E] mb-4">{t('sign_title')}</h1>

            <div className="bg-[#F5F5F5] rounded-xl p-4 mb-5 max-h-48 overflow-y-auto text-sm text-[#1A1A2E]/80 leading-relaxed">
              <p className="mb-3">
                {t('sign_declaration', { name: citizen.full_name, nni: citizen.nni })}
              </p>
              <p>
                Ce document est établi conformément aux dispositions de la Loi n°2013-546 relative aux transactions électroniques. Les attestations émises sur cette base ont valeur légale et peuvent être utilisées dans tout processus officiel nécessitant une preuve académique.
              </p>
            </div>

            <div className="mb-5">
              <p className="text-xs font-semibold text-[#1A1A2E]/50 uppercase tracking-wide mb-3">
                {t('sign_records_covered')}
              </p>
              <div className="space-y-2">
                {records.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 text-sm">
                    <span className="text-[#3333FF]">✓</span>
                    <span className="text-[#1A1A2E]/80">{r.institution} — {r.field_of_study ?? r.record_type} ({r.year_awarded})</span>
                  </div>
                ))}
              </div>
            </div>

            {!showOtp ? (
              <button
                onClick={() => { setShowOtp(true); setTimeout(() => inputRefs.current[0]?.focus(), 100); }}
                className="w-full bg-[#3333FF] hover:bg-[#2222CC] text-white font-semibold py-4 rounded-xl text-base transition-colors"
              >
                {t('sign_otp_button')}
              </button>
            ) : (
              <div className="animate-fadeIn">
                <p className="text-sm font-semibold text-[#1A1A2E] mb-4 text-center">
                  {t('sign_entering_otp')}
                </p>
                <div className="flex justify-center gap-2 mb-3">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="tel"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="otp-input"
                    />
                  ))}
                </div>
                {otpError && <p className="text-sm text-[#E8533F] text-center mb-2">{otpError}</p>}
                <div className="bg-[#F5F5F5] rounded-lg p-2 mb-4 text-xs text-[#1A1A2E]/50 text-center">
                  💡 Any 6-digit code
                </div>
                <button
                  onClick={handleSign}
                  disabled={!otpFilled || signing}
                  className="w-full bg-[#3333FF] hover:bg-[#2222CC] disabled:bg-[#E0E0E0] disabled:text-[#1A1A2E]/40 text-white font-semibold py-4 rounded-xl text-base transition-colors flex items-center justify-center gap-2"
                >
                  {signing ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Émission en cours...
                    </>
                  ) : t('sign_confirm')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Credentials issued */}
        {screen === 'issued' && (
          <div className="animate-fadeIn">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#00C853]/10 mx-auto mb-3">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="14" stroke="#00C853" strokeWidth="2"/>
                  <path d="M9 16L13.5 20.5L23 11" stroke="#00C853" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h1 className="text-xl font-bold text-[#1A1A2E]">{t('credentials_title')}</h1>
            </div>

            <div className="bg-[#FFB300]/10 border border-[#FFB300]/30 rounded-xl px-4 py-3 mb-5 flex items-center gap-2">
              <span className="text-lg">📱</span>
              <p className="text-sm text-[#1A1A2E]/70">{t('credentials_notification')}</p>
            </div>

            <div className="space-y-4 mb-6">
              {credentials.map((cred) => {
                const record = records.find((r) => r.id === cred.record_id);
                return record ? (
                  <CredentialCard
                    key={cred.id}
                    credential={cred}
                    record={record}
                    citizen={citizen}
                    downloadLabel={t('credentials_download')}
                    issuedLabel={t('credentials_issued')}
                  />
                ) : null;
              })}
            </div>

            <div className="space-y-3">
              <button
                onClick={() => router.push('/locker')}
                className="w-full bg-[#3333FF] hover:bg-[#2222CC] text-white font-semibold py-4 rounded-xl text-base transition-colors"
              >
                {t('credentials_go_locker')}
              </button>
              <button
                onClick={() => router.push('/share')}
                className="w-full border-2 border-[#3333FF] text-[#3333FF] font-semibold py-4 rounded-xl text-base transition-colors hover:bg-[#3333FF]/5"
              >
                {t('credentials_share_now')}
              </button>
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
  record,
  citizen,
  downloadLabel,
  issuedLabel,
}: {
  credential: Credential;
  record: AcademicRecord;
  citizen: { full_name: string; nni: string } | null;
  downloadLabel: string;
  issuedLabel: string;
}) {
  const verifyUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/verify/${credential.credential_hash}`;

  async function handleDownload() {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

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
      ['Établissement', record.institution],
      ['Diplôme / Certificat', record.field_of_study ?? record.record_type],
      ['Année', String(record.year_awarded ?? '')],
      ['Mention', record.mention ?? ''],
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
    doc.rect(15, 168, 180, 25, 'F');
    doc.setFontSize(9);
    doc.setTextColor(51, 51, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('Ce document est cryptographiquement signé', 105, 180, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('This document is cryptographically signed', 105, 186, { align: 'center' });

    doc.setFontSize(8);
    doc.setTextColor(120, 120, 140);
    doc.text('Vérifiez sur: ' + verifyUrl, 105, 200, { align: 'center' });

    doc.save(`attestation-${credential.credential_hash}.pdf`);
  }

  return (
    <div className="border-2 border-[#E0E0E0] rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            {citizen && (
              <p className="font-bold text-sm text-[#1A1A2E]">{citizen.full_name}</p>
            )}
            <p className="font-semibold text-sm text-[#1A1A2E] mt-0.5">{record.institution}</p>
            <p className="text-xs text-[#1A1A2E]/50 mt-0.5">
              {record.field_of_study} · {record.year_awarded} · {record.mention}
            </p>
          </div>
          <span className="text-[#00C853] text-xs font-semibold whitespace-nowrap flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5" stroke="#00C853" strokeWidth="1.2"/>
              <path d="M3.5 6L5 7.5L8.5 4" stroke="#00C853" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {issuedLabel}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-white border border-[#E0E0E0] rounded-lg p-2">
            <QRCodeSVG
              value={verifyUrl}
              size={80}
              bgColor="white"
              fgColor="#1A1A2E"
              level="M"
            />
          </div>
          <div className="flex-1">
            <p className="text-xs text-[#1A1A2E]/40 mb-1">Hash</p>
            <p className="text-xs font-mono text-[#1A1A2E] break-all leading-tight">
              {credential.credential_hash}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-[#E0E0E0] px-4 py-3">
        <button
          onClick={handleDownload}
          className="w-full text-[#3333FF] font-semibold text-sm flex items-center justify-center gap-2 py-1"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2V10M8 10L5 7M8 10L11 7" stroke="#3333FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 13H13" stroke="#3333FF" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {downloadLabel}
        </button>
      </div>
    </div>
  );
}
