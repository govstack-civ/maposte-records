'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { LanguageToggle } from '@/components/LanguageToggle';
import { supabase } from '@/lib/supabase';
import type { SharingEvent, Credential, AcademicRecord, Citizen } from '@/lib/types';

interface VerifyData {
  sharing: SharingEvent;
  credential: Credential & { academic_records: AcademicRecord };
  citizen: Pick<Citizen, 'full_name' | 'nni'>;
}

export default function VerifyPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<VerifyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!token) return;

    // Handle direct credential hash (from QR code on credential card)
    async function loadByHash() {
      const { data: credData } = await supabase
        .from('credentials')
        .select('*, academic_records(*)')
        .eq('credential_hash', token)
        .eq('status', 'active')
        .single();

      if (credData) {
        const cred = credData as Credential & { academic_records: AcademicRecord };
        const { data: citizenData } = await supabase
          .from('citizens')
          .select('full_name, nni')
          .eq('id', cred.citizen_id)
          .single();

        setData({
          sharing: {
            id: 'direct',
            credential_id: cred.id,
            citizen_id: cred.citizen_id,
            recipient_name: null,
            recipient_email: null,
            recipient_organisation: null,
            access_level: 'view_only',
            expires_at: null,
            share_token: token,
            shared_at: cred.issued_at,
            status: 'active',
          },
          credential: cred,
          citizen: citizenData as Pick<Citizen, 'full_name' | 'nni'>,
        });
        setLoading(false);
        return true;
      }
      return false;
    }

    // Handle share token
    async function loadByShareToken() {
      const { data: shareData } = await supabase
        .from('sharing_events')
        .select('*, credentials(*, academic_records(*))')
        .eq('share_token', token)
        .single();

      if (!shareData) {
        setExpired(true);
        setLoading(false);
        return;
      }

      const share = shareData as SharingEvent & { credentials: Credential & { academic_records: AcademicRecord } };

      if (share.status === 'revoked' || (share.expires_at && new Date(share.expires_at) < new Date())) {
        setExpired(true);
        setLoading(false);
        return;
      }

      const { data: citizenData } = await supabase
        .from('citizens')
        .select('full_name, nni')
        .eq('id', share.citizen_id)
        .single();

      setData({
        sharing: share as SharingEvent,
        credential: share.credentials,
        citizen: citizenData as Pick<Citizen, 'full_name' | 'nni'>,
      });
      setLoading(false);
    }

    loadByHash().then((found) => {
      if (!found) loadByShareToken();
    });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F5F5F5]">
        <VerifyHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#3333FF]/20 border-t-[#3333FF] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (expired || !data) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F5F5F5]">
        <VerifyHeader />
        <div className="flex-1 max-w-lg mx-auto w-full px-4 py-8">
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[#E8533F]/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⏰</span>
            </div>
            <h1 className="text-xl font-bold text-[#E8533F] mb-2">
              Lien expiré / Link Expired
            </h1>
            <p className="text-sm text-[#1A1A2E]/60">
              Ce lien de partage a expiré ou a été révoqué.<br/>
              This shared link has expired or been revoked.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const rec = data.credential.academic_records;

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F5]">
      <VerifyHeader />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        {/* Verified badge */}
        <div className="bg-[#00C853] rounded-2xl p-5 text-center mb-5">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="12" stroke="white" strokeWidth="2"/>
              <path d="M8 14L12 18L20 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-white font-bold text-lg tracking-widest">✓ VÉRIFIÉ / VERIFIED</p>
        </div>

        {/* Credential details */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
          <div className="bg-[#3333FF] px-5 py-4">
            <p className="text-white/70 text-xs font-medium uppercase tracking-wide mb-1">Attestation académique</p>
            <p className="text-white font-bold text-base">{rec?.field_of_study ?? rec?.record_type}</p>
            <p className="text-white/80 text-sm">{rec?.institution}</p>
          </div>

          <div className="divide-y divide-[#F5F5F5]">
            {[
              { label: 'Citoyen / Citizen', value: data.citizen?.full_name },
              { label: 'NNI', value: data.citizen?.nni },
              { label: 'Établissement / Institution', value: rec?.institution },
              { label: 'Diplôme / Degree', value: rec?.field_of_study ?? rec?.record_type },
              { label: 'Année / Year', value: String(rec?.year_awarded ?? '') },
              { label: 'Mention / Grade', value: rec?.mention ?? '—' },
              { label: 'Émis le / Issued', value: new Date(data.credential.issued_at).toLocaleDateString('fr-FR') },
            ].map(({ label, value }) => (
              <div key={label} className="px-5 py-3 flex justify-between gap-2">
                <span className="text-sm text-[#1A1A2E]/50">{label}</span>
                <span className="text-sm font-semibold text-[#1A1A2E] text-right">{value}</span>
              </div>
            ))}

            {data.sharing.expires_at && data.sharing.id !== 'direct' && (
              <div className="px-5 py-3 flex justify-between gap-2">
                <span className="text-sm text-[#1A1A2E]/50">Lien expire le</span>
                <span className="text-sm font-semibold text-[#1A1A2E]">
                  {new Date(data.sharing.expires_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Issuer note */}
        <div className="bg-[#3333FF]/10 border border-[#3333FF]/20 rounded-xl px-4 py-3 text-center">
          <p className="text-xs text-[#3333FF]/80 leading-relaxed">
            Ce relevé a été émis par {rec?.institution} et est cryptographiquement signé via le portail MaPoste.<br/>
            This credential was issued by {rec?.institution} and is cryptographically signed via the MaPoste portal.
          </p>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-[#1A1A2E]/40">
          <span>🔒</span>
          <span>Propulsé par MaPoste · Powered by GovStack</span>
        </div>
      </main>
    </div>
  );
}

function VerifyHeader() {
  return (
    <header className="bg-white border-b border-[#E0E0E0]">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#3333FF] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2L15 5.5V12.5L9 16L3 12.5V5.5L9 2Z" fill="white" opacity="0.9"/>
              <path d="M9 5L12.5 7V11L9 13L5.5 11V7L9 5Z" fill="#3333FF"/>
              <circle cx="9" cy="9" r="1.5" fill="white"/>
            </svg>
          </div>
          <span className="font-bold text-[#1A1A2E]">MaPoste</span>
          <span className="text-xs text-[#1A1A2E]/40 border-l pl-2 border-[#E0E0E0]">Vérification</span>
        </div>
        <LanguageToggle />
      </div>
    </header>
  );
}
