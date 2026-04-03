"use client";

import { useState, useCallback, useEffect } from "react";
import {
  scanFolder,
  generatePlan,
  executePlan,
  undoPlan,
  findDuplicates,
  deleteDuplicates,
  getStats,
  generatePreviewTree,
  saveUndoHistory,
  loadUndoHistory,
  clearUndoHistory,
  type ScannedFile,
  type PlanItem,
  type DuplicateGroup,
  type UndoHistory,
  type PreviewFolder,
} from "../lib/organizer";
import {
  translations,
  detectLocale,
  getSavedLocale,
  saveLocale,
  LOCALES,
  type Locale,
  type Translation,
} from "../lib/i18n";
import Link from "next/link";
import { getCurrentPlanSync, getCurrentPlan, getPlanLimits, type PlanType } from "../lib/plan";

type AppState =
  | "idle"
  | "scanning"
  | "scanned"
  | "preview"
  | "executing"
  | "done"
  | "undoing"
  | "duplicates";

type ViewMode = "table" | "tree";

export default function Home() {
  const [locale, setLocale] = useState<Locale>("en");
  const [state, setState] = useState<AppState>("idle");
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [files, setFiles] = useState<ScannedFile[]>([]);
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [skippedFiles, setSkippedFiles] = useState<ScannedFile[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [useDateFolders, setUseDateFolders] = useState(false);
  const [includeSubfolders, setIncludeSubfolders] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<{ success: number; errors: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [undoHistory, setUndoHistory] = useState<UndoHistory | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [plan_, setPlan_] = useState<PlanType>("free");

  const t = translations[locale];
  const limits = getPlanLimits(plan_);
  const isPro = plan_ === "pro";

  // 초기화: 언어 감지 + 되돌리기 기록 + 플랜 확인
  useEffect(() => {
    const saved = getSavedLocale();
    setLocale(saved ?? detectLocale());
    setPlan_(getCurrentPlanSync());
    // 서버에서 토큰 서명 검증 (위조 방지)
    getCurrentPlan().then(setPlan_);

    const history = loadUndoHistory();
    if (history && history.records.length > 0) {
      setUndoHistory(history);
    }
  }, []);

  const handleLocaleChange = useCallback((newLocale: Locale) => {
    setLocale(newLocale);
    saveLocale(newLocale);
  }, []);

  const handleSelectFolder = useCallback(async () => {
    try {
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      setDirHandle(handle);
      setError(null);
      setState("scanning");

      const scanned = await scanFolder(handle, includeSubfolders);
      setFiles(scanned);

      const result = generatePlan(scanned, useDateFolders);
      setPlan(result.plan);
      setSkippedFiles(result.skippedFiles);
      setState("scanned");
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setError(t.footerSupport);
    }
  }, [useDateFolders, includeSubfolders, t]);

  const handleDateFolderToggle = useCallback(() => {
    setUseDateFolders((prev) => {
      const next = !prev;
      if (files.length > 0) {
        const r = generatePlan(files, next);
        setPlan(r.plan);
        setSkippedFiles(r.skippedFiles);
      }
      return next;
    });
  }, [files]);

  const handleExecute = useCallback(async () => {
    if (!dirHandle || plan.length === 0) return;

    // 무료 플랜: 파일 수 제한
    const effectivePlan = isPro ? plan : plan.slice(0, limits.maxFiles);

    setState("executing");
    setProgress({ done: 0, total: effectivePlan.length });

    const res = await executePlan(dirHandle, effectivePlan, (done, total) => {
      setProgress({ done, total });
    });

    if (limits.undoEnabled) {
      setUndoHistory(res.history);
      saveUndoHistory(res.history);
    }
    setResult({ success: res.success, errors: res.errors });
    setState("done");
  }, [dirHandle, plan, isPro, limits]);

  const handleUndo = useCallback(async () => {
    if (!dirHandle || !undoHistory) return;

    setState("undoing");
    setProgress({ done: 0, total: undoHistory.records.length });

    const res = await undoPlan(dirHandle, undoHistory, (done, total) => {
      setProgress({ done, total });
    });

    setUndoHistory(null);
    clearUndoHistory();
    setResult(null);
    setState("idle");

    if (res.errors > 0) {
      setError(`Undo: ${res.success} OK, ${res.errors} failed`);
    }
  }, [dirHandle, undoHistory]);

  const handleFindDuplicates = useCallback(async () => {
    if (!dirHandle) return;

    setState("scanning");
    const scanned = files.length > 0 ? files : await scanFolder(dirHandle, includeSubfolders);
    if (files.length === 0) setFiles(scanned);

    setProgress({ done: 0, total: 0 });
    const dupes = await findDuplicates(scanned, (done, total) => {
      setProgress({ done, total });
    });

    setDuplicates(dupes);
    setState("duplicates");
  }, [dirHandle, files, includeSubfolders]);

  const handleReset = useCallback(() => {
    setState("idle");
    setDirHandle(null);
    setFiles([]);
    setPlan([]);
    setDuplicates([]);
    setResult(null);
    setError(null);
    setUndoHistory(null);
  }, []);

  // 카테고리명 번역
  const catName = (key: string) => t.cat[key] ?? key;

  const stats = files.length > 0 ? getStats(files) : null;
  const previewTree = plan.length > 0 ? generatePreviewTree(plan) : null;

  return (
    <main className="flex-1 bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-8 text-center relative">
          <h1
            className={`text-3xl font-bold text-gray-900 ${state !== "idle" ? "cursor-pointer hover:text-blue-600 transition" : ""}`}
            onClick={state !== "idle" ? handleReset : undefined}
          >
            {t.title}
          </h1>
          <p className="mt-2 text-gray-500">{t.subtitle}</p>

          {/* 언어 선택 */}
          <div className="absolute right-6 top-1/2 -translate-y-1/2">
            <select
              value={locale}
              onChange={(e) => handleLocaleChange(e.target.value as Locale)}
              className="text-xs text-gray-500 bg-transparent border border-gray-200 rounded px-2 py-1 cursor-pointer"
            >
              {LOCALES.map((loc) => (
                <option key={loc} value={loc}>
                  {translations[loc].langName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* STEP 1: 폴더 선택 */}
        {state === "idle" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center space-y-6">
            <div className="text-6xl">📁</div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{t.selectFolder}</h2>
              <p className="mt-1 text-sm text-gray-500">
                {t.selectFolderDesc}
                <br />
                {t.noUpload}
              </p>
            </div>

            <div className="flex flex-col items-center gap-2">
              <label className={`flex items-center gap-2 text-sm cursor-pointer ${limits.includeSubfolders ? "text-gray-600" : "text-gray-400"}`}>
                <input
                  type="checkbox"
                  checked={includeSubfolders}
                  onChange={() => limits.includeSubfolders && setIncludeSubfolders((v) => !v)}
                  disabled={!limits.includeSubfolders}
                  className="rounded"
                />
                {t.includeSubfolders}
                {!limits.includeSubfolders && <ProBadge />}
              </label>
              <label className={`flex items-center gap-2 text-sm cursor-pointer ${limits.monthlySort ? "text-gray-600" : "text-gray-400"}`}>
                <input
                  type="checkbox"
                  checked={useDateFolders}
                  onChange={() => limits.monthlySort && handleDateFolderToggle()}
                  disabled={!limits.monthlySort}
                  className="rounded"
                />
                {t.monthlySort}
                {!limits.monthlySort && <ProBadge />}
              </label>
            </div>

            <button
              onClick={handleSelectFolder}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-700 transition cursor-pointer"
            >
              {t.selectFolderBtn}
            </button>

            {undoHistory && undoHistory.records.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-700">
                <p className="font-medium">{t.previousRecord}</p>
                <p className="text-xs mt-1 text-orange-500">
                  {t.previousRecordDesc(undoHistory.folderName, undoHistory.records.length)} ({new Date(undoHistory.timestamp).toLocaleString()})
                </p>
                <div className="mt-3 flex gap-2 justify-center">
                  <button
                    onClick={async () => {
                      try {
                        const handle = await window.showDirectoryPicker({ mode: "readwrite" });
                        setDirHandle(handle);
                        setState("undoing");
                        setProgress({ done: 0, total: undoHistory.records.length });
                        const res = await undoPlan(handle, undoHistory, (done, total) => {
                          setProgress({ done, total });
                        });
                        setUndoHistory(null);
                        clearUndoHistory();
                        setState("idle");
                        if (res.errors > 0) {
                          setError(`Undo: ${res.success} OK, ${res.errors} failed`);
                        }
                      } catch (e) {
                        if (e instanceof Error && e.name === "AbortError") return;
                        setError(t.footerSupport);
                      }
                    }}
                    className="bg-orange-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-orange-600 transition cursor-pointer"
                  >
                    {t.undoBtn}
                  </button>
                  <button
                    onClick={() => { setUndoHistory(null); clearUndoHistory(); }}
                    className="text-orange-400 hover:text-orange-600 px-4 py-1.5 text-sm cursor-pointer"
                  >
                    {t.deleteRecord}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 스캔 중 */}
        {state === "scanning" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center space-y-4">
            <div className="text-4xl animate-spin inline-block">⏳</div>
            <p className="text-gray-600">
              {progress.total > 0 ? t.analyzing(progress.done, progress.total) : t.scanning}
            </p>
          </div>
        )}

        {/* STEP 2: 스캔 결과 + 미리보기 */}
        {(state === "scanned" || state === "preview") && (
          <>
            {stats && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {t.scanResult} — {dirHandle?.name}
                  </h2>
                  <button
                    onClick={handleReset}
                    className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    {t.selectOtherFolder}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.totalFiles}</div>
                    <div className="text-xs text-gray-500">{t.totalFiles}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{plan.length}</div>
                    <div className="text-xs text-gray-500">{t.toOrganize}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {Object.keys(stats.byCategory).length}
                    </div>
                    <div className="text-xs text-gray-500">{t.categories}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {formatSize(stats.totalSize)}
                    </div>
                    <div className="text-xs text-gray-500">{t.totalSize}</div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.entries(stats.byCategory)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, count]) => (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
                      >
                        {catName(cat)} <span className="font-semibold">{count}</span>
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* 옵션 + 뷰 전환 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useDateFolders}
                    onChange={handleDateFolderToggle}
                    className="rounded"
                  />
                  {t.monthlySort.split("(")[0].trim()}
                </label>
                <button
                  onClick={handleFindDuplicates}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                >
                  {t.findDuplicates}
                </button>
              </div>
              {plan.length > 0 && (
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode("table")}
                    className={`px-3 py-1 text-sm rounded-md transition cursor-pointer ${
                      viewMode === "table" ? "bg-white shadow-sm text-gray-900 font-medium" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {t.viewList}
                  </button>
                  <button
                    onClick={() => setViewMode("tree")}
                    className={`px-3 py-1 text-sm rounded-md transition cursor-pointer ${
                      viewMode === "tree" ? "bg-white shadow-sm text-gray-900 font-medium" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {t.viewTree}
                  </button>
                </div>
              )}
            </div>

            {plan.length > 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {viewMode === "table" && (
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">{t.fileName}</th>
                          {includeSubfolders && (
                            <th className="text-left px-4 py-3 font-medium text-gray-600">{t.currentLocation}</th>
                          )}
                          <th className="text-left px-4 py-3 font-medium text-gray-600">{t.classification}</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">{t.targetFolder}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {plan.map((item, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-900 truncate max-w-[200px]">{item.file.name}</td>
                            {includeSubfolders && (
                              <td className="px-4 py-2 text-gray-400 text-xs">{item.file.relativePath || "/"}</td>
                            )}
                            <td className="px-4 py-2">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                                {catName(item.file.category)}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-gray-500">{item.targetFolder}/</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {viewMode === "tree" && previewTree && (
                  <div className="max-h-96 overflow-y-auto p-4">
                    <div className="text-sm text-gray-500 mb-3">{t.previewDesc}</div>
                    <FolderTree folder={previewTree} depth={0} defaultOpen={true} t={t} />
                  </div>
                )}
                <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-2">
                  {!isPro && plan.length > limits.maxFiles && (
                    <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                      <span className="text-sm text-orange-700">
                        {locale === "ko"
                          ? `무료 플랜은 ${limits.maxFiles}개까지 가능합니다. Pro로 업그레이드하세요.`
                          : `Free plan limited to ${limits.maxFiles} files. Upgrade to Pro.`}
                      </span>
                      <Link href="/pricing" className="text-sm bg-blue-600 text-white px-3 py-1 rounded-lg font-medium hover:bg-blue-700 transition">
                        Pro
                      </Link>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">{t.filesReadyCount(Math.min(plan.length, limits.maxFiles))}</span>
                    <button
                      onClick={handleExecute}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition cursor-pointer"
                    >
                      {t.executeBtn}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
                {t.alreadyOrganized}
              </div>
            )}

            {/* 건너뛴 파일 안내 */}
            {skippedFiles.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-sm font-medium text-yellow-800">
                  {locale === "ko"
                    ? `${skippedFiles.length}개 파일은 브라우저 보안 정책으로 자동 정리가 불가능합니다.`
                    : `${skippedFiles.length} files cannot be auto-organized due to browser security policy.`}
                </p>
                <details className="mt-2">
                  <summary className="text-xs text-yellow-600 cursor-pointer">
                    {locale === "ko" ? "파일 목록 보기" : "Show files"}
                  </summary>
                  <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                    {skippedFiles.map((f, i) => (
                      <div key={i} className="text-xs text-yellow-700">{f.name}</div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </>
        )}

        {/* 실행 중 / 되돌리기 중 */}
        {(state === "executing" || state === "undoing") && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-4">
            <h2 className="text-lg font-semibold text-center text-gray-900">
              {state === "executing" ? t.organizing : t.undoing}
            </h2>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${state === "undoing" ? "bg-orange-500" : "bg-blue-600"}`}
                style={{ width: progress.total > 0 ? `${(progress.done / progress.total) * 100}%` : "0%" }}
              />
            </div>
            <p className="text-center text-sm text-gray-500">{t.processed(progress.done, progress.total)}</p>
          </div>
        )}

        {/* 완료 */}
        {state === "done" && result && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center space-y-4">
            <div className="text-6xl">🎉</div>
            <h2 className="text-xl font-semibold text-gray-900">{t.done}</h2>
            <p className="text-gray-600">
              <span className="text-green-600 font-bold">{t.successCount(result.success)}</span>
              {result.errors > 0 && <span className="text-red-500 ml-2">{t.failCount(result.errors)}</span>}
            </p>
            <div className="flex justify-center gap-3">
              {undoHistory && undoHistory.records.length > 0 && (
                <button
                  onClick={handleUndo}
                  className="bg-orange-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-600 transition cursor-pointer"
                >
                  {t.undoBtn}
                </button>
              )}
              <button
                onClick={handleReset}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition cursor-pointer"
              >
                {t.organizeAnother}
              </button>
            </div>
            {undoHistory && undoHistory.records.length > 0 && (
              <p className="text-xs text-gray-400">{t.undoSaved}</p>
            )}
          </div>
        )}

        {/* 중복 파일 결과 */}
        {state === "duplicates" && (
          <DuplicatePanel
            duplicates={duplicates}
            dirHandle={dirHandle}
            onBack={() => setState("scanned")}
            onReset={handleReset}
            t={t}
          />
        )}

        {/* 하단 안내 */}
        <div className="text-center text-xs text-gray-400 space-y-1 pb-8">
          <p>{t.footerBrowser}</p>
          <p>{t.footerMove}</p>
          <p>{t.footerSafe}</p>
          <p>{t.footerUndo}</p>
          <p>{t.footerSupport}</p>
        </div>
      </div>
    </main>
  );
}

// ========== 폴더 트리 미리보기 ==========

function FolderTree({
  folder,
  depth,
  defaultOpen = false,
  t,
}: {
  folder: PreviewFolder;
  depth: number;
  defaultOpen?: boolean;
  t: Translation;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const indent = depth * 20;
  const fileCount = countAllFiles(folder);

  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-1.5 cursor-pointer hover:bg-gray-100 rounded px-2 select-none"
        style={{ paddingLeft: indent }}
        onClick={() => setOpen(!open)}
      >
        <span className={`text-[10px] text-gray-400 transition-transform duration-150 inline-block ${open ? "rotate-90" : ""}`}>
          ▶
        </span>
        <span className="text-sm">{open ? "📂" : "📁"}</span>
        <span className="font-medium text-gray-800 text-sm">{folder.name}</span>
        <span className="text-xs text-gray-400 ml-auto">{fileCount}</span>
      </div>
      {open && (
        <div className="border-l border-gray-200" style={{ marginLeft: indent + 12 }}>
          {folder.subfolders.map((sub) => (
            <FolderTree key={sub.name} folder={sub} depth={depth + 1} t={t} />
          ))}
          {folder.files.map((file) => (
            <div key={file} className="flex items-center gap-1.5 py-0.5 text-sm text-gray-500 pl-4">
              <span className="text-xs">📄</span>
              <span className="truncate">{file}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== 중복 파일 패널 ==========

function DuplicatePanel({
  duplicates,
  dirHandle,
  onBack,
  onReset,
  t,
}: {
  duplicates: DuplicateGroup[];
  dirHandle: FileSystemDirectoryHandle | null;
  onBack: () => void;
  onReset: () => void;
  t: Translation;
}) {
  const [keepIndices, setKeepIndices] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    duplicates.forEach((_, gi) => { initial[gi] = 0; });
    return initial;
  });
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{ success: number; freedBytes: number } | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const filesToDelete = duplicates.flatMap((group, gi) =>
    group.files.filter((_, fi) => fi !== keepIndices[gi])
  );
  const freedSize = filesToDelete.reduce((sum, f) => sum + f.size, 0);

  const handleDelete = async () => {
    if (!dirHandle || filesToDelete.length === 0) return;
    if (!window.confirm(t.confirmDelete(filesToDelete.length, formatSize(freedSize)))) return;

    setDeleting(true);
    setProgress({ done: 0, total: filesToDelete.length });

    const res = await deleteDuplicates(filesToDelete, (done, total) => {
      setProgress({ done, total });
    });

    setDeleting(false);
    setDeleteResult({ success: res.success, freedBytes: res.freedBytes });
  };

  if (deleteResult) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center space-y-4">
        <div className="text-6xl">🗑️</div>
        <h2 className="text-xl font-semibold text-gray-900">{t.duplicatesDone}</h2>
        <p className="text-gray-600">
          <span className="text-green-600 font-bold">{t.deletedCount(deleteResult.success)}</span>,{" "}
          <span className="text-blue-600 font-bold">{t.freedSpace(formatSize(deleteResult.freedBytes))}</span>
        </p>
        <button onClick={onReset} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition cursor-pointer">
          {t.backToStart}
        </button>
      </div>
    );
  }

  if (deleting) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-4">
        <h2 className="text-lg font-semibold text-center text-gray-900">{t.deletingDuplicates}</h2>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-red-500 h-3 rounded-full transition-all duration-300"
            style={{ width: progress.total > 0 ? `${(progress.done / progress.total) * 100}%` : "0%" }}
          />
        </div>
        <p className="text-center text-sm text-gray-500">{progress.done} / {progress.total}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">{t.duplicateResult}</h2>
        <button onClick={onBack} className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer">{t.goBack}</button>
      </div>
      {duplicates.length === 0 ? (
        <div className="p-8 text-center text-gray-500">{t.noDuplicates}</div>
      ) : (
        <>
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 text-sm text-blue-700">
            {t.selectToKeep}
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-200">
            {duplicates.map((group, gi) => (
              <div key={gi} className="p-4">
                <div className="text-xs text-gray-400 mb-2">
                  {t.group(gi + 1)} — {t.identicalFiles(group.files.length)} ({formatSize(group.files[0].size)})
                </div>
                {group.files.map((f, fi) => {
                  const isKept = keepIndices[gi] === fi;
                  return (
                    <label
                      key={fi}
                      className={`flex items-center gap-3 py-1.5 px-2 rounded cursor-pointer transition ${
                        isKept ? "bg-green-50 border border-green-200" : "hover:bg-red-50 border border-transparent"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`dup-group-${gi}`}
                        checked={isKept}
                        onChange={() => setKeepIndices((prev) => ({ ...prev, [gi]: fi }))}
                        className="accent-green-600"
                      />
                      <span className={`text-sm flex-1 ${isKept ? "text-green-800 font-medium" : "text-gray-500 line-through"}`}>
                        {f.name}
                      </span>
                      <span className="text-xs text-gray-400">{isKept ? t.keep : t.remove}</span>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-between items-center">
            <span className="text-sm text-gray-500">{t.toDeleteCount(filesToDelete.length, formatSize(freedSize))}</span>
            <button
              onClick={handleDelete}
              className="bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 transition cursor-pointer"
            >
              {t.deleteSelected}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function countAllFiles(folder: PreviewFolder): number {
  let count = folder.files.length;
  for (const sub of folder.subfolders) count += countAllFiles(sub);
  return count;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function ProBadge() {
  return (
    <Link href="/pricing" className="inline-flex items-center px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold hover:bg-blue-200 transition">
      PRO
    </Link>
  );
}
