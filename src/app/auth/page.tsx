'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { Header } from '@/components/Header';
import { ProgressBar } from '@/components/ProgressBar';
import { Footer } from '@/components/Footer';
import { supabase, logAuditEvent } from '@/lib/supabase';
import { getSession } from '@/lib/session';

const MAX_ATTEMPTS = 3;
const RESEND_COUNTDOWN = 45;

export default function AuthPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [step, setStep] = useState<'nni' | 'otp'>('nni');
  const [nni, setNni] = useState('');
  const [nniError, setNniError] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COUNTDOWN);
  const [verifying, setVerifying] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Pre-fill NNI from session
  useEffect(() => {
    const { nni: savedNni } = getSession();
    if (savedNni) setNni(savedNni);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (step !== 'otp' || countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [step, countdown]);

  async function handleSendOtp() {
    if (nni.length !== 11) {
      setNniError(t('elig_nni_error'));
      return;
    }

    const { data: citizens } = await supabase
      .from('citizens')
      .select('phone')
      .eq('nni', nni)
      .limit(1);

    const citizenPhone = citizens?.[0]?.phone ?? '+225 07 ●●●● ●●87';
    const maskedPhone = citizenPhone.replace(/\d(?=\d{2})/g, '●');
    setPhone(maskedPhone);
    setStep('otp');
    setCountdown(RESEND_COUNTDOWN);
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  }

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setOtpError('');
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerify() {
    const code = otp.join('');
    if (code.length !== 6) return;

    if (locked) return;

    setVerifying(true);
    await new Promise((r) => setTimeout(r, 800));

    // Accept any valid 6-digit code in prototype
    const valid = code.length === 6 && /^\d{6}$/.test(code);

    if (!valid) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= MAX_ATTEMPTS) {
        setLocked(true);
        setOtpError(t('auth_locked'));
      } else {
        setOtpError(t('auth_invalid_otp') + ' ' + t('auth_attempts_left', { n: MAX_ATTEMPTS - newAttempts }));
      }
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      setVerifying(false);
      return;
    }

    const { nni: savedNni, citizenId } = getSession();
    await logAuditEvent(citizenId, 'authenticated', { nni: savedNni });
    router.push('/consent');
  }

  const otpFilled = otp.every((d) => d !== '');

  return (
    <div className="min-h-screen flex flex-col">
      <Header showBack onBack={() => step === 'otp' ? setStep('nni') : router.push('/eligibility')} />
      <ProgressBar currentStep={2} />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        <h1 className="text-xl font-bold text-[#1A1A2E] mb-1">{t('auth_title')}</h1>

        {step === 'nni' && (
          <div className="animate-fadeIn mt-6">
            <div className="bg-[#F5F5F5] rounded-xl p-4 mb-6 flex items-center gap-3">
              <span className="text-2xl">🔒</span>
              <p className="text-sm text-[#1A1A2E]/70">
                {t('auth_send_otp')} — {t('auth_title').toLowerCase()}
              </p>
            </div>

            <label className="block text-sm font-semibold text-[#1A1A2E] mb-2">
              {t('auth_nni_label')}
            </label>
            <input
              type="tel"
              inputMode="numeric"
              value={nni}
              onChange={(e) => {
                setNni(e.target.value.replace(/\D/g, '').slice(0, 11));
                setNniError('');
              }}
              placeholder="10294857362"
              className={`w-full border-2 rounded-xl px-4 py-3 text-lg font-mono tracking-widest text-center text-[#1A1A2E] bg-white outline-none transition-colors ${
                nniError ? 'border-[#E8533F]' : 'border-[#E0E0E0] focus:border-[#3333FF]'
              }`}
              maxLength={11}
              onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
            />
            {nniError && <p className="text-sm text-[#E8533F] mt-1">{nniError}</p>}

            <button
              onClick={handleSendOtp}
              disabled={nni.length !== 11}
              className="w-full mt-5 bg-[#3333FF] hover:bg-[#2222CC] disabled:bg-[#E0E0E0] disabled:text-[#1A1A2E]/40 text-white font-semibold py-4 rounded-xl text-base transition-colors"
            >
              {t('auth_send_otp')}
            </button>
          </div>
        )}

        {step === 'otp' && (
          <div className="animate-fadeIn mt-6">
            <div className="bg-[#3333FF]/10 border border-[#3333FF]/20 rounded-xl p-4 mb-6">
              <p className="text-sm text-[#1A1A2E]/70">
                {t('auth_otp_sent', { phone })}
              </p>
            </div>

            <p className="text-sm font-semibold text-[#1A1A2E] mb-4 text-center">
              {t('auth_enter_otp')}
            </p>

            <div className="flex justify-center gap-2 mb-4">
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
                  disabled={locked}
                  onPaste={(e) => {
                    e.preventDefault();
                    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                    const newOtp = paste.split('').concat(['', '', '', '', '', '']).slice(0, 6);
                    setOtp(newOtp);
                    inputRefs.current[Math.min(paste.length, 5)]?.focus();
                  }}
                />
              ))}
            </div>

            {otpError && (
              <p className="text-sm text-[#E8533F] text-center mb-3">{otpError}</p>
            )}

            <p className="text-xs text-[#1A1A2E]/50 text-center mb-6">
              {countdown > 0
                ? t('auth_resend', { seconds: countdown })
                : <button
                    onClick={() => { setCountdown(RESEND_COUNTDOWN); setOtp(['', '', '', '', '', '']); setOtpError(''); setAttempts(0); setLocked(false); }}
                    className="text-[#3333FF] font-semibold"
                  >
                    {t('auth_resend_now')}
                  </button>
              }
            </p>

            <div className="bg-[#F5F5F5] rounded-lg p-3 mb-4 text-xs text-[#1A1A2E]/50 text-center">
              💡 Prototype: any 6-digit code is accepted
            </div>

            <button
              onClick={handleVerify}
              disabled={!otpFilled || verifying || locked}
              className="w-full bg-[#3333FF] hover:bg-[#2222CC] disabled:bg-[#E0E0E0] disabled:text-[#1A1A2E]/40 text-white font-semibold py-4 rounded-xl text-base transition-colors flex items-center justify-center gap-2"
            >
              {verifying ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('auth_signing_in')}
                </>
              ) : t('auth_verify')}
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
