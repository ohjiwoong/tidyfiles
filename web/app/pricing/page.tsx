"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  translations,
  detectLocale,
  getSavedLocale,
  saveLocale,
  LOCALES,
  type Locale,
} from "../lib/i18n";
import { loadLicenseKey, saveLicenseKey, validateLicenseKey, clearLicenseKey } from "../lib/plan";

// TODO: Lemon Squeezy 상품 생성 후 실제 URL로 교체
const LEMON_CHECKOUT_URL = "https://sortmyfiles.lemonsqueezy.com/buy/TODO";

const PRICING: Record<string, Record<string, string>> = {
  ko: {
    title: "요금제",
    subtitle: "기본 기능은 무료. Pro로 업그레이드하면 모든 제한이 해제됩니다.",
    free: "무료",
    freePrice: "₩0",
    freePeriod: "영구 무료",
    pro: "Pro",
    proPrice: "₩4,900",
    proPeriod: "1회 결제 · 평생 이용",
    current: "현재 플랜",
    upgrade: "Pro 업그레이드",
    f1: "파일 분류 (50개까지)",
    f2: "미리보기",
    f3: "10개 언어 지원",
    p1: "파일 분류 (무제한)",
    p2: "중복 파일 삭제",
    p3: "하위 폴더 포함",
    p4: "되돌리기 기능",
    p5: "월별 분류",
    p6: "모든 무료 기능 포함",
    licenseTitle: "라이선스 키 등록",
    licenseDesc: "결제 후 이메일로 받은 라이선스 키를 입력하세요.",
    licenseBtn: "등록",
    licenseSuccess: "Pro 활성화 완료!",
    licenseFail: "유효하지 않은 키입니다.",
    licensePlaceholder: "라이선스 키 입력",
    activated: "Pro 활성화됨",
    deactivate: "비활성화",
  },
  en: {
    title: "Pricing",
    subtitle: "Basic features are free. Upgrade to Pro to unlock everything.",
    free: "Free",
    freePrice: "$0",
    freePeriod: "Free forever",
    pro: "Pro",
    proPrice: "$3.99",
    proPeriod: "One-time payment · Lifetime access",
    current: "Current Plan",
    upgrade: "Upgrade to Pro",
    f1: "File sorting (up to 50 files)",
    f2: "Preview before organizing",
    f3: "10 language support",
    p1: "File sorting (unlimited)",
    p2: "Duplicate file deletion",
    p3: "Include subfolders",
    p4: "Undo / restore",
    p5: "Monthly sorting",
    p6: "All free features included",
    licenseTitle: "Enter License Key",
    licenseDesc: "Enter the license key you received after purchase.",
    licenseBtn: "Activate",
    licenseSuccess: "Pro activated!",
    licenseFail: "Invalid license key.",
    licensePlaceholder: "Enter license key",
    activated: "Pro Activated",
    deactivate: "Deactivate",
  },
};

function getP(locale: Locale): Record<string, string> {
  return PRICING[locale] ?? PRICING["en"];
}

export default function PricingPage() {
  const [locale, setLocale] = useState<Locale>("en");
  const [isPro, setIsPro] = useState(false);
  const [licenseInput, setLicenseInput] = useState("");
  const [licenseStatus, setLicenseStatus] = useState<"idle" | "checking" | "success" | "fail">("idle");

  useEffect(() => {
    const saved = getSavedLocale();
    setLocale(saved ?? detectLocale());
    setIsPro(!!loadLicenseKey());
  }, []);

  const p = getP(locale);
  const t = translations[locale];

  const handleActivate = async () => {
    if (!licenseInput.trim()) return;
    setLicenseStatus("checking");

    const input = licenseInput.trim();

    // 1. 이미 발급된 토큰인지 서버 검증
    const valid = await validateLicenseKey(input);
    if (valid) {
      saveLicenseKey(input);
      setIsPro(true);
      setLicenseStatus("success");
      return;
    }

    // 2. 활성화 코드인지 확인 (테스트 코드 또는 프로모션 코드)
    try {
      const res = await fetch("/api/license/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: input }),
      });
      const data = await res.json();
      if (data.success && data.licenseToken) {
        saveLicenseKey(data.licenseToken);
        setIsPro(true);
        setLicenseStatus("success");
        return;
      }
    } catch {}

    setLicenseStatus("fail");
  };

  const handleDeactivate = () => {
    clearLicenseKey();
    setIsPro(false);
    setLicenseStatus("idle");
    setLicenseInput("");
  };

  return (
    <main className="flex-1 bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-gray-900">SortMyFiles</Link>
          <div className="flex items-center gap-4">
            <select
              value={locale}
              onChange={(e) => { setLocale(e.target.value as Locale); saveLocale(e.target.value as Locale); }}
              className="text-xs text-gray-500 bg-transparent border border-gray-200 rounded px-2 py-1 cursor-pointer"
            >
              {LOCALES.map((loc) => (
                <option key={loc} value={loc}>{translations[loc].langName}</option>
              ))}
            </select>
            <Link href="/app" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              {t.selectFolderBtn}
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900">{p.title}</h1>
          <p className="mt-2 text-gray-500">{p.subtitle}</p>
        </div>

        {/* 플랜 카드 */}
        <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Free */}
          <div className="border border-gray-200 rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{p.free}</h2>
              <div className="mt-2">
                <span className="text-3xl font-bold text-gray-900">{p.freePrice}</span>
              </div>
              <p className="text-sm text-gray-400 mt-1">{p.freePeriod}</p>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span>{p.f1}</li>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span>{p.f2}</li>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span>{p.f3}</li>
            </ul>
            {!isPro && (
              <Link href="/app" className="block text-center bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition">
                {p.current}
              </Link>
            )}
          </div>

          {/* Pro */}
          <div className="border-2 border-blue-600 rounded-xl p-6 space-y-4 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-medium">
              BEST
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{p.pro}</h2>
              <div className="mt-2">
                <span className="text-3xl font-bold text-gray-900">{p.proPrice}</span>
              </div>
              <p className="text-sm text-gray-400 mt-1">{p.proPeriod}</p>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span>{p.p1}</li>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span>{p.p2}</li>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span>{p.p3}</li>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span>{p.p4}</li>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span>{p.p5}</li>
              <li className="flex items-center gap-2 text-gray-400"><span className="text-green-500">✓</span>{p.p6}</li>
            </ul>
            {isPro ? (
              <div className="text-center bg-green-50 text-green-700 py-2 rounded-lg text-sm font-medium">
                {p.activated}
              </div>
            ) : (
              <Link
                href={locale === "ko" ? "/checkout" : LEMON_CHECKOUT_URL}
                className="block text-center bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                {p.upgrade}
              </Link>
            )}
          </div>
        </div>

        {/* 라이선스 키 등록 */}
        <div className="max-w-md mx-auto mt-12 bg-gray-50 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-1">{p.licenseTitle}</h3>
          <p className="text-sm text-gray-500 mb-4">{p.licenseDesc}</p>

          {isPro ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-600 font-medium">✓ {p.activated}</span>
              <button
                onClick={handleDeactivate}
                className="text-sm text-red-500 hover:text-red-700 cursor-pointer"
              >
                {p.deactivate}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={licenseInput}
                onChange={(e) => { setLicenseInput(e.target.value); setLicenseStatus("idle"); }}
                placeholder={p.licensePlaceholder}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleActivate}
                disabled={licenseStatus === "checking"}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
              >
                {licenseStatus === "checking" ? "..." : p.licenseBtn}
              </button>
            </div>
          )}
          {licenseStatus === "success" && (
            <p className="mt-2 text-sm text-green-600">{p.licenseSuccess}</p>
          )}
          {licenseStatus === "fail" && (
            <p className="mt-2 text-sm text-red-500">{p.licenseFail}</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between text-xs text-gray-400">
          <span>SortMyFiles</span>
          <a href="https://github.com/ohjiwoong/sortmyfiles" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600">GitHub</a>
        </div>
      </footer>
    </main>
  );
}
