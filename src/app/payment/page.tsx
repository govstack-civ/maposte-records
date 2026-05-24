'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { Header } from '@/components/Header';
import { ProgressBar } from '@/components/ProgressBar';
import { Footer } from '@/components/Footer';
import { supabase, logAuditEvent } from '@/lib/supabase';
import { getSession, PAYMENT_KEY } from '@/lib/session';
import type { PaymentMethod } from '@/lib/types';

type Screen = 'method' | 'pin' | 'success' | 'failed';

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: string; keyFr: 'payment_orange' | 'payment_mtn' | 'payment_card' | 'payment_voucher' }[] = [
  { id: 'orange_money', label: 'Orange Money', icon: '🟠', keyFr: 'payment_orange' },
  { id: 'mtn_momo', label: 'MTN Mobile Money', icon: '🟡', keyFr: 'payment_mtn' },
  { id: 'card', label: 'Carte bancaire', icon: '💳', keyFr: 'payment_card' },
  { id: 'voucher', label: 'Bon de paiement MaPoste', icon: '🏪', keyFr: 'payment_voucher' },
];

export default function PaymentPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('method');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [pin, setPin] = useState('');
  const [processing, setProcessing] = useState(false);
  const [txId, setTxId] = useState('');
  const [amount, setAmount] = useState(2000);
  const [paymentId, setPaymentId] = useState('');

  useEffect(() => {
    const { citizenId } = getSession();
    if (!citizenId) { router.push('/eligibility'); return; }

    supabase
      .from('academic_records')
      .select('id')
      .eq('citizen_id', citizenId)
      .eq('status', 'available')
      .then(({ data }) => {
        setAmount((data?.length ?? 2) * 1000);
      });
  }, [router]);

  async function handlePay() {
    if (!selectedMethod || pin.length < 4) return;

    setProcessing(true);
    const { citizenId } = getSession();
    const randomTx = `TXN-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    setTxId(randomTx);

    // Create payment record
    const { data } = await supabase.from('payments').insert({
      citizen_id: citizenId,
      amount,
      method: selectedMethod,
      status: 'pending',
      transaction_id: randomTx,
    }).select('id').single();

    await new Promise((r) => setTimeout(r, 2000));

    // Update to completed
    if (data?.id) {
      await supabase.from('payments').update({
        status: 'completed',
        paid_at: new Date().toISOString(),
      }).eq('id', data.id);
      setPaymentId(data.id);
      localStorage.setItem(PAYMENT_KEY, data.id);
    }

    await logAuditEvent(citizenId, 'payment_completed', {
      amount,
      method: selectedMethod,
      transaction_id: randomTx,
    });

    setProcessing(false);
    setScreen('success');
  }

  function getMethodLabel(method: PaymentMethod) {
    const m = PAYMENT_METHODS.find((m) => m.id === method);
    return `${m?.icon ?? ''} ${t(m?.keyFr ?? 'payment_orange')}`;
  }

  const now = new Date().toLocaleString('fr-CI', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header showBack onBack={() => {
        if (screen === 'pin') setScreen('method');
        else if (screen === 'failed') setScreen('method');
        else router.push('/retrieve');
      }} />
      <ProgressBar currentStep={5} />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">

        {/* Method selection */}
        {screen === 'method' && (
          <div className="animate-fadeIn">
            <h1 className="text-xl font-bold text-[#1A1A2E] mb-2">{t('payment_title')}</h1>
            <div className="bg-[#3333FF]/10 rounded-xl p-4 text-center mb-6">
              <p className="text-3xl font-bold text-[#3333FF]">{amount.toLocaleString()} FCFA</p>
              <p className="text-xs text-[#1A1A2E]/50 mt-1">{amount / 1000} attestation(s) × 1 000 FCFA</p>
            </div>

            <div className="space-y-3 mb-6">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    selectedMethod === method.id
                      ? 'border-[#3333FF] bg-[#3333FF]/5'
                      : 'border-[#E0E0E0] bg-white hover:border-[#3333FF]/40'
                  }`}
                >
                  <span className="text-2xl">{method.icon}</span>
                  <span className="font-semibold text-sm text-[#1A1A2E]">{t(method.keyFr)}</span>
                  <div className="ml-auto">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      selectedMethod === method.id ? 'border-[#3333FF]' : 'border-[#E0E0E0]'
                    }`}>
                      {selectedMethod === method.id && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#3333FF]" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setScreen('pin')}
              disabled={!selectedMethod}
              className="w-full bg-[#3333FF] hover:bg-[#2222CC] disabled:bg-[#E0E0E0] disabled:text-[#1A1A2E]/40 text-white font-semibold py-4 rounded-xl text-base transition-colors"
            >
              {t('payment_pay', { amount: amount.toLocaleString() })}
            </button>
          </div>
        )}

        {/* PIN entry */}
        {screen === 'pin' && selectedMethod && (
          <div className="animate-fadeIn">
            <div className="text-center mb-6">
              <span className="text-4xl">{PAYMENT_METHODS.find((m) => m.id === selectedMethod)?.icon}</span>
              <p className="font-semibold text-[#1A1A2E] mt-2">{getMethodLabel(selectedMethod)}</p>
              <p className="text-2xl font-bold text-[#3333FF] mt-1">{amount.toLocaleString()} FCFA</p>
            </div>

            <label className="block text-sm font-semibold text-[#1A1A2E] mb-2 text-center">
              {t('payment_pin')}
            </label>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••"
              className="w-full border-2 border-[#E0E0E0] focus:border-[#3333FF] rounded-xl px-4 py-4 text-xl text-center tracking-widest outline-none transition-colors"
              maxLength={6}
              autoFocus
            />

            <div className="bg-[#F5F5F5] rounded-lg p-3 mt-3 mb-5 text-xs text-[#1A1A2E]/50 text-center">
              💡 Prototype: any PIN is accepted
            </div>

            <button
              onClick={handlePay}
              disabled={pin.length < 4 || processing}
              className="w-full bg-[#3333FF] hover:bg-[#2222CC] disabled:bg-[#E0E0E0] disabled:text-[#1A1A2E]/40 text-white font-semibold py-4 rounded-xl text-base transition-colors flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('payment_processing')}
                </>
              ) : t('confirm')}
            </button>
          </div>
        )}

        {/* Success */}
        {screen === 'success' && (
          <div className="animate-fadeIn text-center">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-[#00C853]/10 mx-auto mb-4">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="18" stroke="#00C853" strokeWidth="2"/>
                <path d="M12 20L17.5 25.5L28 14" stroke="#00C853" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-[#1A1A2E] mb-1">{t('payment_success')}</h1>
            <p className="text-sm text-[#1A1A2E]/50 mb-6">{t('payment_receipt')}</p>

            <div className="bg-[#F5F5F5] rounded-xl overflow-hidden text-left mb-6">
              {[
                { label: t('payment_amount_label'), value: `${amount.toLocaleString()} FCFA` },
                { label: t('payment_method_label'), value: selectedMethod ? getMethodLabel(selectedMethod) : '' },
                { label: t('payment_tx_id'), value: txId },
                { label: t('payment_date'), value: now },
              ].map(({ label, value }) => (
                <div key={label} className="px-4 py-3 border-b border-[#E0E0E0] last:border-0 flex justify-between gap-2">
                  <span className="text-sm text-[#1A1A2E]/50">{label}</span>
                  <span className="text-sm font-semibold text-[#1A1A2E] text-right">{value}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => router.push('/credentials')}
              className="w-full bg-[#3333FF] hover:bg-[#2222CC] text-white font-semibold py-4 rounded-xl text-base transition-colors"
            >
              {t('continue')}
            </button>
          </div>
        )}

        {/* Failed */}
        {screen === 'failed' && (
          <div className="animate-fadeIn text-center">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-[#E8533F]/10 mx-auto mb-4">
              <span className="text-4xl">❌</span>
            </div>
            <h1 className="text-xl font-bold text-[#E8533F] mb-2">{t('payment_failed')}</h1>
            <p className="text-sm text-[#1A1A2E]/60 mb-6">{t('payment_failed_detail')}</p>
            <div className="space-y-3">
              <button
                onClick={() => setScreen('pin')}
                className="w-full bg-[#3333FF] hover:bg-[#2222CC] text-white font-semibold py-4 rounded-xl text-base transition-colors"
              >
                {t('payment_retry')}
              </button>
              <button
                onClick={() => { setSelectedMethod(null); setPin(''); setScreen('method'); }}
                className="w-full border-2 border-[#E0E0E0] text-[#1A1A2E] font-semibold py-4 rounded-xl text-base transition-colors hover:border-[#3333FF]/40"
              >
                {t('payment_different_method')}
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
