import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://tidyfiles-sigma.vercel.app";

export const metadata: Metadata = {
  title: {
    default: "SortMyFiles — Organize messy folders in one click",
    template: "%s | SortMyFiles",
  },
  description:
    "Free browser-based file organizer. Sort your Downloads, Desktop, and messenger files instantly. No install, no upload, complete privacy. Supports 10 languages.",
  keywords: [
    "file organizer",
    "파일 정리",
    "folder organizer",
    "duplicate file finder",
    "중복 파일",
    "다운로드 폴더 정리",
    "desktop cleaner",
    "browser file manager",
    "KakaoTalk files",
    "WhatsApp files",
    "file sorter",
    "ファイル整理",
    "文件整理",
  ],
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: "SortMyFiles — Organize messy folders in one click",
    description:
      "Free browser-based file organizer. Sort Downloads, Desktop, and messenger files instantly. No install needed.",
    siteName: "SortMyFiles",
    locale: "en_US",
    alternateLocale: ["ko_KR", "ja_JP", "zh_CN", "es_ES", "de_DE", "fr_FR", "pt_BR", "vi_VN", "th_TH"],
  },
  twitter: {
    card: "summary_large_image",
    title: "SortMyFiles — Organize messy folders in one click",
    description:
      "Free browser-based file organizer. No install, no upload, complete privacy.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="canonical" href={SITE_URL} />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}

        {/* JSON-LD 구조화 데이터 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "SortMyFiles",
              url: SITE_URL,
              description:
                "Free browser-based file organizer. Sort Downloads, Desktop, and messenger files instantly.",
              applicationCategory: "UtilitiesApplication",
              operatingSystem: "Windows, macOS, Linux",
              browserRequirements: "Chrome 86+, Edge 86+",
              offers: [
                {
                  "@type": "Offer",
                  price: "0",
                  priceCurrency: "USD",
                  name: "Free",
                },
                {
                  "@type": "Offer",
                  price: "3.99",
                  priceCurrency: "USD",
                  name: "Pro",
                },
              ],
              inLanguage: ["en", "ko", "ja", "zh", "es", "de", "fr", "pt", "vi", "th"],
            }),
          }}
        />
      </body>
    </html>
  );
}
