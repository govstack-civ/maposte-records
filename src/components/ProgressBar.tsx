'use client';

import { useLanguage } from '@/context/LanguageContext';

const STEPS = [
  { key: 'step_eligibility' as const, index: 1 },
  { key: 'step_login' as const, index: 2 },
  { key: 'step_consent' as const, index: 3 },
  { key: 'step_retrieve' as const, index: 4 },
  { key: 'step_payment' as const, index: 5 },
  { key: 'step_signature' as const, index: 6 },
  { key: 'step_receive' as const, index: 7 },
];

interface ProgressBarProps {
  currentStep: number; // 1–7
}

export function ProgressBar({ currentStep }: ProgressBarProps) {
  const { t } = useLanguage();

  return (
    <div className="bg-white border-b border-[#E0E0E0] px-4 py-2">
      <div className="max-w-lg mx-auto">
        {/* Mobile: compact dots */}
        <div className="flex items-center gap-1 sm:hidden">
          {STEPS.map((step) => (
            <div
              key={step.index}
              className={`h-1 flex-1 rounded-full transition-colors ${
                step.index < currentStep
                  ? 'bg-[#00C853]'
                  : step.index === currentStep
                  ? 'bg-[#3333FF]'
                  : 'bg-[#E0E0E0]'
              }`}
            />
          ))}
        </div>
        {/* Desktop: step labels */}
        <div className="hidden sm:flex items-center">
          {STEPS.map((step, i) => (
            <div key={step.index} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step.index < currentStep
                      ? 'bg-[#00C853] text-white'
                      : step.index === currentStep
                      ? 'bg-[#3333FF] text-white'
                      : 'bg-[#E0E0E0] text-[#1A1A2E]/40'
                  }`}
                >
                  {step.index < currentStep ? '✓' : step.index}
                </div>
                <span
                  className={`text-[10px] mt-0.5 whitespace-nowrap ${
                    step.index === currentStep
                      ? 'text-[#3333FF] font-semibold'
                      : step.index < currentStep
                      ? 'text-[#00C853]'
                      : 'text-[#1A1A2E]/40'
                  }`}
                >
                  {t(step.key)}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 transition-colors ${
                    step.index < currentStep ? 'bg-[#00C853]' : 'bg-[#E0E0E0]'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
