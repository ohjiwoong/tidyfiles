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
} from "./lib/i18n";

const FEATURES = [
  { icon: "📂", titleKey: "f1Title", descKey: "f1Desc" },
  { icon: "🔍", titleKey: "f2Title", descKey: "f2Desc" },
  { icon: "↩️", titleKey: "f3Title", descKey: "f3Desc" },
  { icon: "⚡", titleKey: "f4Title", descKey: "f4Desc" },
  { icon: "🔒", titleKey: "f5Title", descKey: "f5Desc" },
  { icon: "🌍", titleKey: "f6Title", descKey: "f6Desc" },
] as const;

const LANDING: Record<string, Record<string, string>> = {
  ko: {
    hero: "지저분한 폴더,\n클릭 한 번으로 정리",
    heroSub: "다운로드, 바탕화면, 카카오톡 받은 파일 — 설치 없이 브라우저에서 바로 정리하세요.",
    cta: "무료로 시작하기",
    howTitle: "어떻게 작동하나요?",
    step1: "폴더 선택",
    step1d: "정리할 폴더를 선택하고 브라우저 접근 권한을 허용하세요.",
    step2: "미리보기 확인",
    step2d: "파일이 어떻게 분류되는지 실행 전에 미리 확인합니다.",
    step3: "정리 완료",
    step3d: "클릭 한 번으로 파일이 카테고리별 폴더로 정리됩니다.",
    featTitle: "주요 기능",
    f1Title: "스마트 파일 분류",
    f1Desc: "12개 카테고리로 자동 분류. 카카오톡, WhatsApp 등 메신저 파일도 자동 감지.",
    f2Title: "중복 파일 탐지",
    f2Desc: "동일한 파일을 찾아서 보존할 파일을 선택하고 나머지를 삭제. 용량을 확보하세요.",
    f3Title: "안전한 되돌리기",
    f3Desc: "정리 후에도 원래 상태로 복원 가능. 기록은 브라우저에 저장되어 나중에도 복원.",
    f4Title: "빠른 처리 속도",
    f4Desc: "move API로 경로만 변경하여 즉시 처리. 5개 파일 병렬 처리로 대량 파일도 빠르게.",
    f5Title: "완전한 프라이버시",
    f5Desc: "모든 처리는 브라우저에서 실행. 파일이 서버로 전송되지 않습니다.",
    f6Title: "10개 언어 지원",
    f6Desc: "한국어, English, 日本語, 中文, Español, Deutsch, Français, Português 등 지원.",
    faq: "자주 묻는 질문",
    q1: "정말 무료인가요?",
    a1: "네, 기본 파일 분류 기능은 완전히 무료입니다.",
    q2: "파일이 서버로 전송되나요?",
    a2: "아닙니다. 모든 처리는 브라우저 안에서만 이루어집니다. 파일이 외부로 나가지 않습니다.",
    q3: "어떤 브라우저에서 사용할 수 있나요?",
    a3: "Chrome과 Edge에서 사용 가능합니다. File System Access API를 지원하는 브라우저가 필요합니다.",
    q4: "파일이 손실될 수 있나요?",
    a4: "아닙니다. 파일은 복사 완료 후 원본을 삭제하므로 도중에 중단되어도 손실이 없으며, 되돌리기 기능으로 원래 상태로 복원할 수 있습니다.",
    bottomCta: "지금 바로 시작하세요",
    bottomSub: "설치도, 회원가입도 필요 없습니다.",
  },
  en: {
    hero: "Messy folders?\nOrganized in one click.",
    heroSub: "Downloads, Desktop, messenger files — sort them instantly in your browser. No install needed.",
    cta: "Start for Free",
    howTitle: "How does it work?",
    step1: "Select Folder",
    step1d: "Choose a folder and grant browser access permission.",
    step2: "Preview Changes",
    step2d: "See exactly how files will be sorted before executing.",
    step3: "Done!",
    step3d: "Files are organized into category folders with one click.",
    featTitle: "Features",
    f1Title: "Smart File Sorting",
    f1Desc: "Auto-sort into 12 categories. Detects KakaoTalk, WhatsApp, LINE, Telegram & more.",
    f2Title: "Duplicate Detection",
    f2Desc: "Find identical files, choose which to keep, and delete the rest to free up space.",
    f3Title: "Safe Undo",
    f3Desc: "Restore files to their original location anytime. History is saved in your browser.",
    f4Title: "Lightning Fast",
    f4Desc: "Uses move API for instant file moves. Processes 5 files in parallel.",
    f5Title: "Complete Privacy",
    f5Desc: "Everything runs in your browser. No files are ever uploaded to any server.",
    f6Title: "10 Languages",
    f6Desc: "Korean, English, Japanese, Chinese, Spanish, German, French, Portuguese & more.",
    faq: "FAQ",
    q1: "Is it really free?",
    a1: "Yes, the basic file sorting feature is completely free.",
    q2: "Are my files uploaded to a server?",
    a2: "No. All processing happens entirely in your browser. Your files never leave your computer.",
    q3: "Which browsers are supported?",
    a3: "Chrome and Edge are supported. The File System Access API is required.",
    q4: "Can I lose my files?",
    a4: "No. Files are copied before originals are removed. Even if interrupted, nothing is lost. You can also undo to restore everything.",
    bottomCta: "Get Started Now",
    bottomSub: "No install, no sign-up required.",
  },
  ja: {
    hero: "散らかったフォルダを\nワンクリックで整理",
    heroSub: "ダウンロード、デスクトップ、メッセンジャーのファイル — インストール不要、ブラウザで即整理。",
    cta: "無料で始める",
    howTitle: "使い方",
    step1: "フォルダを選択", step1d: "整理したいフォルダを選んでブラウザのアクセスを許可します。",
    step2: "プレビュー確認", step2d: "実行前にファイルの分類結果を確認できます。",
    step3: "整理完了", step3d: "ワンクリックでカテゴリ別フォルダに整理されます。",
    featTitle: "主な機能",
    f1Title: "スマート分類", f1Desc: "12カテゴリに自動分類。KakaoTalk、WhatsApp、LINEなどのメッセンジャーファイルも自動検出。",
    f2Title: "重複ファイル検出", f2Desc: "同一ファイルを発見し、保持するファイルを選択して残りを削除。容量を確保。",
    f3Title: "安全な元に戻す", f3Desc: "整理後も元の状態に復元可能。履歴はブラウザに保存。",
    f4Title: "高速処理", f4Desc: "move APIでパス変更のみの即時処理。5ファイル並列処理で大量ファイルも高速。",
    f5Title: "完全なプライバシー", f5Desc: "すべての処理はブラウザ内で実行。ファイルはサーバーに送信されません。",
    f6Title: "10言語対応", f6Desc: "日本語、English、한국어、中文、Español、Deutsch、Françaisなど対応。",
    faq: "よくある質問",
    q1: "本当に無料ですか？", a1: "はい、基本的なファイル整理機能は完全無料です。",
    q2: "ファイルはサーバーに送信されますか？", a2: "いいえ。すべての処理はブラウザ内のみで行われます。",
    q3: "対応ブラウザは？", a3: "ChromeとEdgeに対応しています。",
    q4: "ファイルが失われることはありますか？", a4: "ありません。コピー完了後に元ファイルを削除するため、中断してもファイルは失われません。元に戻す機能で復元も可能です。",
    bottomCta: "今すぐ始める", bottomSub: "インストールも会員登録も不要です。",
  },
  zh: {
    hero: "杂乱的文件夹\n一键整理",
    heroSub: "下载、桌面、聊天文件 — 无需安装，浏览器中直接整理。",
    cta: "免费开始",
    howTitle: "如何使用？",
    step1: "选择文件夹", step1d: "选择要整理的文件夹并授权浏览器访问。",
    step2: "预览确认", step2d: "执行前查看文件将如何分类。",
    step3: "整理完成", step3d: "一键将文件整理到分类文件夹中。",
    featTitle: "主要功能",
    f1Title: "智能文件分类", f1Desc: "自动分为12个类别。自动检测KakaoTalk、WhatsApp、LINE、Telegram等即时通讯文件。",
    f2Title: "重复文件检测", f2Desc: "发现相同文件，选择保留哪个，删除其余释放空间。",
    f3Title: "安全撤销", f3Desc: "整理后可恢复到原始状态。记录保存在浏览器中。",
    f4Title: "极速处理", f4Desc: "使用move API仅更改路径实现即时处理。5个文件并行处理。",
    f5Title: "完全隐私", f5Desc: "所有处理在浏览器中进行。文件不会发送到任何服务器。",
    f6Title: "支持10种语言", f6Desc: "中文、English、한국어、日本語、Español、Deutsch、Français等。",
    faq: "常见问题",
    q1: "真的免费吗？", a1: "是的，基本文件整理功能完全免费。",
    q2: "文件会上传到服务器吗？", a2: "不会。所有处理仅在浏览器中进行。",
    q3: "支持哪些浏览器？", a3: "支持Chrome和Edge浏览器。",
    q4: "文件会丢失吗？", a4: "不会。文件复制完成后才删除原件，即使中断也不会丢失。还可以通过撤销功能恢复。",
    bottomCta: "立即开始", bottomSub: "无需安装，无需注册。",
  },
  es: {
    hero: "¿Carpetas desordenadas?\nOrganizadas en un clic.",
    heroSub: "Descargas, Escritorio, archivos de mensajería — ordénalos al instante en tu navegador.",
    cta: "Empezar gratis",
    howTitle: "¿Cómo funciona?",
    step1: "Seleccionar carpeta", step1d: "Elige una carpeta y permite el acceso del navegador.",
    step2: "Vista previa", step2d: "Ve cómo se clasificarán los archivos antes de ejecutar.",
    step3: "¡Listo!", step3d: "Los archivos se organizan en carpetas por categoría con un clic.",
    featTitle: "Características",
    f1Title: "Clasificación inteligente", f1Desc: "Clasificación automática en 12 categorías. Detecta KakaoTalk, WhatsApp, LINE, Telegram y más.",
    f2Title: "Detección de duplicados", f2Desc: "Encuentra archivos idénticos, elige cuál conservar y elimina el resto.",
    f3Title: "Deshacer seguro", f3Desc: "Restaura archivos a su ubicación original en cualquier momento.",
    f4Title: "Ultra rápido", f4Desc: "Usa move API para mover archivos instantáneamente. Procesa 5 archivos en paralelo.",
    f5Title: "Privacidad total", f5Desc: "Todo se ejecuta en tu navegador. Ningún archivo se sube a ningún servidor.",
    f6Title: "10 idiomas", f6Desc: "Español, English, 한국어, 日本語, 中文, Deutsch, Français, Português y más.",
    faq: "Preguntas frecuentes",
    q1: "¿Es realmente gratis?", a1: "Sí, la función básica de organización es completamente gratuita.",
    q2: "¿Se suben mis archivos a un servidor?", a2: "No. Todo el procesamiento ocurre en tu navegador.",
    q3: "¿Qué navegadores son compatibles?", a3: "Chrome y Edge son compatibles.",
    q4: "¿Puedo perder mis archivos?", a4: "No. Los archivos se copian antes de eliminar los originales. También puedes deshacer para restaurar todo.",
    bottomCta: "Empieza ahora", bottomSub: "Sin instalación, sin registro.",
  },
  de: {
    hero: "Unordentliche Ordner?\nMit einem Klick sortiert.",
    heroSub: "Downloads, Desktop, Messenger-Dateien — sofort im Browser sortieren. Keine Installation nötig.",
    cta: "Kostenlos starten",
    howTitle: "Wie funktioniert es?",
    step1: "Ordner wählen", step1d: "Wähle einen Ordner und erlaube den Browserzugriff.",
    step2: "Vorschau prüfen", step2d: "Sieh genau, wie Dateien sortiert werden, bevor du ausführst.",
    step3: "Fertig!", step3d: "Dateien werden mit einem Klick in Kategorieordner sortiert.",
    featTitle: "Funktionen",
    f1Title: "Intelligente Sortierung", f1Desc: "Automatische Sortierung in 12 Kategorien. Erkennt KakaoTalk, WhatsApp, LINE, Telegram und mehr.",
    f2Title: "Duplikaterkennung", f2Desc: "Finde identische Dateien, wähle welche behalten werden und lösche den Rest.",
    f3Title: "Sicheres Rückgängig", f3Desc: "Stelle Dateien jederzeit am ursprünglichen Ort wieder her.",
    f4Title: "Blitzschnell", f4Desc: "Verwendet move API für sofortige Dateibewegungen. Verarbeitet 5 Dateien parallel.",
    f5Title: "Volle Privatsphäre", f5Desc: "Alles läuft im Browser. Keine Dateien werden auf Server hochgeladen.",
    f6Title: "10 Sprachen", f6Desc: "Deutsch, English, 한국어, 日本語, 中文, Español, Français, Português und mehr.",
    faq: "Häufig gestellte Fragen",
    q1: "Ist es wirklich kostenlos?", a1: "Ja, die grundlegende Dateisortierung ist komplett kostenlos.",
    q2: "Werden meine Dateien auf einen Server hochgeladen?", a2: "Nein. Alle Verarbeitung findet ausschließlich im Browser statt.",
    q3: "Welche Browser werden unterstützt?", a3: "Chrome und Edge werden unterstützt.",
    q4: "Können meine Dateien verloren gehen?", a4: "Nein. Dateien werden kopiert, bevor Originale entfernt werden. Auch bei Unterbrechung geht nichts verloren.",
    bottomCta: "Jetzt starten", bottomSub: "Keine Installation, keine Registrierung.",
  },
  fr: {
    hero: "Dossiers en désordre ?\nOrganisés en un clic.",
    heroSub: "Téléchargements, Bureau, fichiers de messagerie — triez-les instantanément dans votre navigateur.",
    cta: "Commencer gratuitement",
    howTitle: "Comment ça marche ?",
    step1: "Sélectionner un dossier", step1d: "Choisissez un dossier et autorisez l'accès du navigateur.",
    step2: "Aperçu", step2d: "Voyez comment les fichiers seront classés avant d'exécuter.",
    step3: "Terminé !", step3d: "Les fichiers sont organisés dans des dossiers par catégorie en un clic.",
    featTitle: "Fonctionnalités",
    f1Title: "Tri intelligent", f1Desc: "Tri automatique en 12 catégories. Détecte KakaoTalk, WhatsApp, LINE, Telegram et plus.",
    f2Title: "Détection de doublons", f2Desc: "Trouvez les fichiers identiques, choisissez lequel garder et supprimez le reste.",
    f3Title: "Annulation sécurisée", f3Desc: "Restaurez les fichiers à leur emplacement d'origine à tout moment.",
    f4Title: "Ultra rapide", f4Desc: "Utilise l'API move pour des déplacements instantanés. Traite 5 fichiers en parallèle.",
    f5Title: "Confidentialité totale", f5Desc: "Tout s'exécute dans votre navigateur. Aucun fichier n'est envoyé à un serveur.",
    f6Title: "10 langues", f6Desc: "Français, English, 한국어, 日本語, 中文, Español, Deutsch, Português et plus.",
    faq: "Questions fréquentes",
    q1: "C'est vraiment gratuit ?", a1: "Oui, la fonction de tri de base est entièrement gratuite.",
    q2: "Mes fichiers sont-ils envoyés sur un serveur ?", a2: "Non. Tout le traitement se fait dans votre navigateur.",
    q3: "Quels navigateurs sont compatibles ?", a3: "Chrome et Edge sont compatibles.",
    q4: "Puis-je perdre mes fichiers ?", a4: "Non. Les fichiers sont copiés avant suppression des originaux. Même en cas d'interruption, rien n'est perdu.",
    bottomCta: "Commencer maintenant", bottomSub: "Sans installation, sans inscription.",
  },
  pt: {
    hero: "Pastas bagunçadas?\nOrganizadas em um clique.",
    heroSub: "Downloads, Área de Trabalho, arquivos de mensageiros — organize instantaneamente no navegador.",
    cta: "Começar grátis",
    howTitle: "Como funciona?",
    step1: "Selecionar pasta", step1d: "Escolha uma pasta e permita o acesso do navegador.",
    step2: "Visualizar", step2d: "Veja como os arquivos serão classificados antes de executar.",
    step3: "Pronto!", step3d: "Arquivos organizados em pastas por categoria com um clique.",
    featTitle: "Recursos",
    f1Title: "Classificação inteligente", f1Desc: "Classificação automática em 12 categorias. Detecta KakaoTalk, WhatsApp, LINE, Telegram e mais.",
    f2Title: "Detecção de duplicatas", f2Desc: "Encontre arquivos idênticos, escolha qual manter e exclua o resto.",
    f3Title: "Desfazer seguro", f3Desc: "Restaure arquivos ao local original a qualquer momento.",
    f4Title: "Ultra rápido", f4Desc: "Usa move API para mover arquivos instantaneamente. Processa 5 arquivos em paralelo.",
    f5Title: "Privacidade total", f5Desc: "Tudo roda no navegador. Nenhum arquivo é enviado a servidores.",
    f6Title: "10 idiomas", f6Desc: "Português, English, 한국어, 日本語, 中文, Español, Deutsch, Français e mais.",
    faq: "Perguntas frequentes",
    q1: "É realmente grátis?", a1: "Sim, a função básica de organização é completamente gratuita.",
    q2: "Meus arquivos são enviados para um servidor?", a2: "Não. Todo o processamento acontece no seu navegador.",
    q3: "Quais navegadores são suportados?", a3: "Chrome e Edge são suportados.",
    q4: "Posso perder meus arquivos?", a4: "Não. Arquivos são copiados antes de remover os originais. Mesmo se interrompido, nada se perde.",
    bottomCta: "Comece agora", bottomSub: "Sem instalação, sem cadastro.",
  },
  vi: {
    hero: "Thư mục lộn xộn?\nSắp xếp chỉ với một cú nhấp.",
    heroSub: "Tải xuống, Máy tính, tệp tin nhắn — sắp xếp ngay trong trình duyệt. Không cần cài đặt.",
    cta: "Bắt đầu miễn phí",
    howTitle: "Cách hoạt động?",
    step1: "Chọn thư mục", step1d: "Chọn thư mục và cho phép trình duyệt truy cập.",
    step2: "Xem trước", step2d: "Xem cách tệp sẽ được phân loại trước khi thực hiện.",
    step3: "Hoàn tất!", step3d: "Tệp được sắp xếp vào thư mục theo danh mục chỉ với một nhấp.",
    featTitle: "Tính năng",
    f1Title: "Phân loại thông minh", f1Desc: "Tự động phân thành 12 danh mục. Phát hiện KakaoTalk, WhatsApp, LINE, Telegram và hơn thế.",
    f2Title: "Phát hiện trùng lặp", f2Desc: "Tìm tệp giống nhau, chọn giữ tệp nào và xóa phần còn lại.",
    f3Title: "Hoàn tác an toàn", f3Desc: "Khôi phục tệp về vị trí ban đầu bất cứ lúc nào.",
    f4Title: "Tốc độ nhanh", f4Desc: "Sử dụng move API để di chuyển tệp ngay lập tức. Xử lý 5 tệp song song.",
    f5Title: "Riêng tư hoàn toàn", f5Desc: "Mọi xử lý diễn ra trong trình duyệt. Không có tệp nào được gửi đến máy chủ.",
    f6Title: "10 ngôn ngữ", f6Desc: "Tiếng Việt, English, 한국어, 日本語, 中文, Español, Deutsch, Français và hơn thế.",
    faq: "Câu hỏi thường gặp",
    q1: "Thực sự miễn phí?", a1: "Có, tính năng sắp xếp tệp cơ bản hoàn toàn miễn phí.",
    q2: "Tệp có được tải lên máy chủ không?", a2: "Không. Mọi xử lý chỉ diễn ra trong trình duyệt.",
    q3: "Hỗ trợ trình duyệt nào?", a3: "Hỗ trợ Chrome và Edge.",
    q4: "Tệp có bị mất không?", a4: "Không. Tệp được sao chép trước khi xóa bản gốc. Ngay cả khi bị gián đoạn cũng không mất dữ liệu.",
    bottomCta: "Bắt đầu ngay", bottomSub: "Không cần cài đặt, không cần đăng ký.",
  },
  th: {
    hero: "โฟลเดอร์รก?\nจัดระเบียบในคลิกเดียว",
    heroSub: "ดาวน์โหลด เดสก์ท็อป ไฟล์แชท — จัดเรียงทันทีในเบราว์เซอร์ ไม่ต้องติดตั้ง",
    cta: "เริ่มใช้ฟรี",
    howTitle: "ทำงานอย่างไร?",
    step1: "เลือกโฟลเดอร์", step1d: "เลือกโฟลเดอร์และอนุญาตการเข้าถึงของเบราว์เซอร์",
    step2: "ดูตัวอย่าง", step2d: "ดูว่าไฟล์จะถูกจัดเรียงอย่างไรก่อนดำเนินการ",
    step3: "เสร็จสิ้น!", step3d: "ไฟล์ถูกจัดระเบียบลงในโฟลเดอร์ตามหมวดหมู่ด้วยคลิกเดียว",
    featTitle: "คุณสมบัติ",
    f1Title: "การจัดเรียงอัจฉริยะ", f1Desc: "จัดเรียงอัตโนมัติเป็น 12 หมวดหมู่ ตรวจจับ KakaoTalk, WhatsApp, LINE, Telegram และอื่นๆ",
    f2Title: "ตรวจจับไฟล์ซ้ำ", f2Desc: "ค้นหาไฟล์ที่เหมือนกัน เลือกเก็บไฟล์ไหนและลบที่เหลือ",
    f3Title: "เลิกทำอย่างปลอดภัย", f3Desc: "กู้คืนไฟล์กลับไปตำแหน่งเดิมได้ทุกเมื่อ",
    f4Title: "เร็วสุดขีด", f4Desc: "ใช้ move API ย้ายไฟล์ทันที ประมวลผล 5 ไฟล์พร้อมกัน",
    f5Title: "ความเป็นส่วนตัวสมบูรณ์", f5Desc: "ทุกการประมวลผลเกิดขึ้นในเบราว์เซอร์ ไม่มีไฟล์ถูกส่งไปยังเซิร์ฟเวอร์",
    f6Title: "10 ภาษา", f6Desc: "ไทย, English, 한국어, 日本語, 中文, Español, Deutsch, Français และอื่นๆ",
    faq: "คำถามที่พบบ่อย",
    q1: "ฟรีจริงหรือ?", a1: "ใช่ ฟีเจอร์จัดเรียงไฟล์พื้นฐานฟรีทั้งหมด",
    q2: "ไฟล์จะถูกอัปโหลดไปยังเซิร์ฟเวอร์หรือไม่?", a2: "ไม่ การประมวลผลทั้งหมดเกิดขึ้นในเบราว์เซอร์เท่านั้น",
    q3: "รองรับเบราว์เซอร์ใดบ้าง?", a3: "รองรับ Chrome และ Edge",
    q4: "ไฟล์จะสูญหายได้หรือไม่?", a4: "ไม่ ไฟล์จะถูกคัดลอกก่อนลบต้นฉบับ แม้ถูกขัดจังหวะก็ไม่มีอะไรสูญหาย",
    bottomCta: "เริ่มเลย", bottomSub: "ไม่ต้องติดตั้ง ไม่ต้องสมัคร",
  },
};

function getLanding(locale: Locale): Record<string, string> {
  return LANDING[locale] ?? LANDING["en"];
}

export default function LandingPage() {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    const saved = getSavedLocale();
    setLocale(saved ?? detectLocale());
  }, []);

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    saveLocale(newLocale);
  };

  const t = translations[locale];
  const l = getLanding(locale);

  return (
    <main className="flex-1 bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-lg font-bold text-gray-900">TidyFiles</span>
          <div className="flex items-center gap-4">
            <select
              value={locale}
              onChange={(e) => handleLocaleChange(e.target.value as Locale)}
              className="text-xs text-gray-500 bg-transparent border border-gray-200 rounded px-2 py-1 cursor-pointer"
            >
              {LOCALES.map((loc) => (
                <option key={loc} value={loc}>{translations[loc].langName}</option>
              ))}
            </select>
            <Link
              href="/app"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              {l.cta}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight whitespace-pre-line">
          {l.hero}
        </h1>
        <p className="mt-6 text-lg text-gray-500 max-w-2xl mx-auto">
          {l.heroSub}
        </p>
        <div className="mt-8">
          <Link
            href="/app"
            className="inline-block bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
          >
            {l.cta}
          </Link>
        </div>
        <p className="mt-4 text-sm text-gray-400">{l.bottomSub}</p>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">{l.howTitle}</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: "1", title: l.step1, desc: l.step1d, icon: "📁" },
              { step: "2", title: l.step2, desc: l.step2d, icon: "👀" },
              { step: "3", title: l.step3, desc: l.step3d, icon: "✅" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="text-4xl mb-3">{item.icon}</div>
                <div className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full text-sm font-bold mb-3">
                  {item.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">{l.featTitle}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.titleKey} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{l[f.titleKey]}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{l[f.descKey]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">{l.faq}</h2>
          <div className="space-y-4">
            {(["1", "2", "3", "4"] as const).map((n) => (
              <details key={n} className="bg-white border border-gray-200 rounded-xl p-5 group">
                <summary className="font-medium text-gray-900 cursor-pointer list-none flex justify-between items-center">
                  {l[`q${n}`]}
                  <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-3 text-sm text-gray-500 leading-relaxed">{l[`a${n}`]}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">{l.bottomCta}</h2>
        <p className="text-gray-500 mb-8">{l.bottomSub}</p>
        <Link
          href="/app"
          className="inline-block bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
        >
          {l.cta}
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <span>TidyFiles — {t.footerBrowser}</span>
          <div className="flex items-center gap-4">
            <a href="https://github.com/ohjiwoong/tidyfiles" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
