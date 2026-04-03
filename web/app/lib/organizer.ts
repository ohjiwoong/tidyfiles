/**
 * 파일 정리 핵심 엔진 (브라우저용)
 * File System Access API 기반
 */

import { EXT_TO_CATEGORY, IGNORE_PATTERNS, BROWSER_BLOCKED_EXTENSIONS } from "./config";

export function isBrowserBlocked(filename: string): boolean {
  const ext = filename.lastIndexOf(".") >= 0
    ? filename.slice(filename.lastIndexOf(".")).toLowerCase()
    : "";
  return BROWSER_BLOCKED_EXTENSIONS.includes(ext);
}

// ========== 타입 정의 ==========

export interface ScannedFile {
  name: string;
  handle: FileSystemFileHandle;
  parentHandle: FileSystemDirectoryHandle; // 파일이 속한 폴더
  relativePath: string; // 루트 기준 상대 경로 (예: "" 또는 "폴더A/폴더B")
  extension: string;
  category: string;
  size: number;
  lastModified: Date;
  nameInfo: FileNameInfo;
}

export interface FileNameInfo {
  source: string | null;
  dateFromName: Date | null;
  subcategory: string | null;
}

export interface PlanItem {
  file: ScannedFile;
  targetFolder: string; // 예: "사진" 또는 "사진/스크린샷" 또는 "사진/2024-03"
  reason: string;
}

export interface DuplicateGroup {
  hash: string;
  files: ScannedFile[];
}

export interface MoveRecord {
  fileName: string;
  sourcePath: string; // 원래 상대 경로 ("" = 루트, "폴더A/폴더B" = 하위)
  targetFolder: string;
}

export interface UndoHistory {
  timestamp: Date;
  folderName: string; // 어떤 폴더에서 정리했는지
  records: MoveRecord[];
}

// ========== 되돌리기 기록 localStorage 저장 ==========

const UNDO_STORAGE_KEY = "sortmyfiles-undo-history";

export function saveUndoHistory(history: UndoHistory): void {
  try {
    const data = {
      ...history,
      timestamp: history.timestamp.toISOString(),
    };
    localStorage.setItem(UNDO_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage 용량 초과 등 무시
  }
}

export function loadUndoHistory(): UndoHistory | null {
  try {
    const raw = localStorage.getItem(UNDO_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return {
      ...data,
      timestamp: new Date(data.timestamp),
    };
  } catch {
    return null;
  }
}

export function clearUndoHistory(): void {
  localStorage.removeItem(UNDO_STORAGE_KEY);
}

// 미리보기용: 정리 후 폴더 구조
export interface PreviewFolder {
  name: string;
  files: string[];
  subfolders: PreviewFolder[];
}

// ========== 카테고리 분류 ==========

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(idx).toLowerCase() : "";
}

function getCategory(filename: string): string {
  const ext = getExtension(filename);
  return EXT_TO_CATEGORY[ext] ?? "기타";
}

function shouldIgnore(filename: string): boolean {
  return IGNORE_PATTERNS.includes(filename.toLowerCase());
}

// ========== 파일명 패턴 분석 ==========

const MESSENGER_PATTERNS: { pattern: RegExp; source: string; dateGroup?: number }[] = [
  // KakaoTalk: KakaoTalk_20240315_내용.ext
  { pattern: /^KakaoTalk_(\d{8})_?(.*)/, source: "KakaoTalk", dateGroup: 1 },
  // WhatsApp: WhatsApp Image 2024-03-15 or WhatsApp Video 2024-03-15
  { pattern: /^WhatsApp[_ ](Image|Video|Audio|Document)[_ ](\d{4}[-_]\d{2}[-_]\d{2})/, source: "WhatsApp" },
  // LINE: LINE_P20240315_120000.jpg
  { pattern: /^LINE_[A-Z](\d{8})/, source: "LINE", dateGroup: 1 },
  // Telegram: telegram-cloud-photo-size or telegram_photo
  { pattern: /^telegram[-_](cloud[-_])?/i, source: "Telegram" },
  // WeChat: mmexport1234567890.jpg or wx_camera_1234567890.jpg
  { pattern: /^(mmexport|wx_camera_)\d+/, source: "WeChat" },
  // Discord: attachments or unknown.png style
  { pattern: /^discord[-_]/i, source: "Discord" },
  // Zalo (Vietnam)
  { pattern: /^Zalo[-_ ]/i, source: "Zalo" },
];

const SCREENSHOT_PATTERNS = [
  /Screenshot[_ ](\d{4}[-_]\d{2}[-_]\d{2})/i,
  /스크린샷[_ ](\d{4}[-_]\d{2}[-_]\d{2})/i,
  /Capture[_ ](\d{4}[-_]\d{2}[-_]\d{2})/i,
  /スクリーンショット/i,
  /截屏/,
  /截图/,
];
const DATE_PATTERN = /(\d{4})[-_]?(\d{2})[-_]?(\d{2})/;

function analyzeFilename(filename: string): FileNameInfo {
  const info: FileNameInfo = { source: null, dateFromName: null, subcategory: null };

  // 메신저 파일 감지
  for (const { pattern, source, dateGroup } of MESSENGER_PATTERNS) {
    const match = filename.match(pattern);
    if (match) {
      info.source = source;
      if (dateGroup && match[dateGroup]) {
        const ds = match[dateGroup].replace(/[-_]/g, "");
        if (ds.length >= 8) {
          const y = parseInt(ds.slice(0, 4));
          const m = parseInt(ds.slice(4, 6)) - 1;
          const d = parseInt(ds.slice(6, 8));
          info.dateFromName = new Date(y, m, d);
        }
      }
      return info;
    }
  }

  // 스크린샷 감지
  for (const pattern of SCREENSHOT_PATTERNS) {
    if (pattern.test(filename)) {
      info.subcategory = "스크린샷";
      break;
    }
  }

  // 날짜 추출
  const dateMatch = filename.match(DATE_PATTERN);
  if (dateMatch) {
    const y = parseInt(dateMatch[1]);
    const m = parseInt(dateMatch[2]);
    const d = parseInt(dateMatch[3]);
    if (y >= 2000 && y <= 2099 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      info.dateFromName = new Date(y, m - 1, d);
    }
  }

  return info;
}

// ========== 폴더 스캔 ==========

export async function scanFolder(
  dirHandle: FileSystemDirectoryHandle,
  includeSubfolders: boolean = false
): Promise<ScannedFile[]> {
  const files: ScannedFile[] = [];
  await scanFolderRecursive(dirHandle, dirHandle, "", files, includeSubfolders);
  return files;
}

async function scanFolderRecursive(
  rootHandle: FileSystemDirectoryHandle,
  currentHandle: FileSystemDirectoryHandle,
  relativePath: string,
  files: ScannedFile[],
  includeSubfolders: boolean
): Promise<void> {
  for await (const entry of currentHandle.values()) {
    if (entry.kind === "directory" && includeSubfolders) {
      const subDir = await currentHandle.getDirectoryHandle(entry.name);
      const subPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      await scanFolderRecursive(rootHandle, subDir, subPath, files, true);
      continue;
    }

    if (entry.kind !== "file") continue;

    const fileHandle = entry as FileSystemFileHandle;
    const name = fileHandle.name;

    if (shouldIgnore(name)) continue;

    const file = await fileHandle.getFile();
    const nameInfo = analyzeFilename(name);

    files.push({
      name,
      handle: fileHandle,
      parentHandle: currentHandle,
      relativePath,
      extension: getExtension(name),
      category: getCategory(name),
      size: file.size,
      lastModified: new Date(file.lastModified),
      nameInfo,
    });
  }
}

// ========== 정리 계획 생성 ==========

export interface PlanResult {
  plan: PlanItem[];
  skippedFiles: ScannedFile[]; // 브라우저 보안 팝업 대상 파일
}

export function generatePlan(
  files: ScannedFile[],
  useDateFolders: boolean = false
): PlanResult {
  const plan: PlanItem[] = [];
  const skippedFiles: ScannedFile[] = [];

  for (const f of files) {
    // 브라우저 보안 팝업 대상 확장자 → 건너뛰기
    if (isBrowserBlocked(f.name)) {
      skippedFiles.push(f);
      continue;
    }
    let category = f.category;

    // 서브카테고리 적용
    if (f.nameInfo.subcategory) {
      category = `${category}/${f.nameInfo.subcategory}`;
    }

    // 날짜 폴더 옵션
    let targetFolder = category;
    if (useDateFolders) {
      const date = f.nameInfo.dateFromName ?? f.lastModified;
      const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      targetFolder = `${category}/${ym}`;
    }

    let reason = `확장자 [${f.extension}] → ${category}`;
    if (f.nameInfo.source) {
      reason = `${f.nameInfo.source} 파일 → ${category}`;
    }

    plan.push({ file: f, targetFolder, reason });
  }

  return { plan, skippedFiles };
}

// ========== 정리 실행 ==========

async function getOrCreateSubfolder(
  root: FileSystemDirectoryHandle,
  path: string
): Promise<FileSystemDirectoryHandle> {
  let current = root;
  for (const part of path.split("/")) {
    current = await current.getDirectoryHandle(part, { create: true });
  }
  return current;
}

// move() API 지원 여부 확인
function supportsMoveAPI(handle: FileSystemFileHandle): boolean {
  return typeof handle.move === "function";
}

// 단일 파일 이동 (move 우선, 폴백으로 복사+삭제)
async function moveFile(
  item: PlanItem,
  targetDir: FileSystemDirectoryHandle
): Promise<void> {
  // move() 우선 시도 — 팝업 없이 즉시 이동
  if (supportsMoveAPI(item.file.handle)) {
    try {
      await item.file.handle.move(targetDir, item.file.name);
      return;
    } catch {
      // move 실패 시 fallback
    }
  }

  // fallback: 복사+삭제 (일부 확장자에서 브라우저 보안 팝업이 뜰 수 있음)
  const originalFile = await item.file.handle.getFile();
  const newFileHandle = await targetDir.getFileHandle(item.file.name, { create: true });
  const writable = await newFileHandle.createWritable();
  await writable.write(await originalFile.arrayBuffer());
  await writable.close();
  await item.file.parentHandle.removeEntry(item.file.name);
}

const CONCURRENCY = 5;

export async function executePlan(
  dirHandle: FileSystemDirectoryHandle,
  plan: PlanItem[],
  onProgress?: (done: number, total: number) => void
): Promise<{ success: number; errors: number; errorMessages: string[]; history: UndoHistory }> {
  let success = 0;
  let errors = 0;
  let done = 0;
  const errorMessages: string[] = [];
  const records: MoveRecord[] = [];

  // 대상 폴더를 미리 생성 (중복 방지를 위해 순차적으로)
  const targetDirs = new Map<string, FileSystemDirectoryHandle>();
  for (const item of plan) {
    if (!targetDirs.has(item.targetFolder)) {
      targetDirs.set(item.targetFolder, await getOrCreateSubfolder(dirHandle, item.targetFolder));
    }
  }

  // 병렬 처리
  const processItem = async (item: PlanItem) => {
    try {
      const targetDir = targetDirs.get(item.targetFolder)!;
      await moveFile(item, targetDir);

      records.push({
        fileName: item.file.name,
        sourcePath: item.file.relativePath,
        targetFolder: item.targetFolder,
      });
      success++;
    } catch (e) {
      errors++;
      errorMessages.push(`${item.file.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
    done++;
    onProgress?.(done, plan.length);
  };

  // CONCURRENCY개씩 묶어서 병렬 실행
  for (let i = 0; i < plan.length; i += CONCURRENCY) {
    const batch = plan.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(processItem));
  }

  return {
    success,
    errors,
    errorMessages,
    history: { timestamp: new Date(), folderName: dirHandle.name, records },
  };
}

// ========== 되돌리기 ==========

export async function undoPlan(
  dirHandle: FileSystemDirectoryHandle,
  history: UndoHistory,
  onProgress?: (done: number, total: number) => void
): Promise<{ success: number; errors: number; errorMessages: string[] }> {
  let success = 0;
  let errors = 0;
  let done = 0;
  const errorMessages: string[] = [];
  const total = history.records.length;

  const processRecord = async (record: MoveRecord) => {
    try {
      const subDir = await getOrCreateSubfolder(dirHandle, record.targetFolder);
      const fileHandle = await subDir.getFileHandle(record.fileName);

      const originalDir = record.sourcePath
        ? await getOrCreateSubfolder(dirHandle, record.sourcePath)
        : dirHandle;

      // move() 우선, 폴백으로 복사+삭제
      if (supportsMoveAPI(fileHandle)) {
        await fileHandle.move(originalDir, record.fileName);
      } else {
        const file = await fileHandle.getFile();
        const restoredHandle = await originalDir.getFileHandle(record.fileName, { create: true });
        const writable = await restoredHandle.createWritable();
        await writable.write(await file.arrayBuffer());
        await writable.close();
        await subDir.removeEntry(record.fileName);
      }

      success++;
    } catch (e) {
      errors++;
      errorMessages.push(`${record.fileName}: ${e instanceof Error ? e.message : String(e)}`);
    }
    done++;
    onProgress?.(done, total);
  };

  for (let i = 0; i < total; i += CONCURRENCY) {
    const batch = history.records.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(processRecord));
  }

  // 빈 폴더 정리 시도
  await cleanEmptyFolders(dirHandle);

  return { success, errors, errorMessages };
}

// 빈 폴더 삭제 (되돌리기 후 정리용)
async function cleanEmptyFolders(dirHandle: FileSystemDirectoryHandle): Promise<void> {
  for await (const entry of dirHandle.values()) {
    if (entry.kind !== "directory") continue;
    const subDir = await dirHandle.getDirectoryHandle(entry.name);

    // 재귀적으로 하위 폴더 먼저 정리
    await cleanEmptyFolders(subDir);

    // 비어있으면 삭제
    let isEmpty = true;
    for await (const _ of subDir.values()) {
      isEmpty = false;
      break;
    }
    if (isEmpty) {
      try {
        await dirHandle.removeEntry(entry.name);
      } catch {
        // 삭제 실패해도 무시
      }
    }
  }
}

// ========== 미리보기: 정리 후 폴더 구조 ==========

export function generatePreviewTree(plan: PlanItem[]): PreviewFolder {
  const root: PreviewFolder = { name: "(선택한 폴더)", files: [], subfolders: [] };

  for (const item of plan) {
    const parts = item.targetFolder.split("/");
    let current = root;

    for (const part of parts) {
      let sub = current.subfolders.find((f) => f.name === part);
      if (!sub) {
        sub = { name: part, files: [], subfolders: [] };
        current.subfolders.push(sub);
      }
      current = sub;
    }

    current.files.push(item.file.name);
  }

  // 정렬
  sortPreviewFolder(root);
  return root;
}

function sortPreviewFolder(folder: PreviewFolder): void {
  folder.subfolders.sort((a, b) => a.name.localeCompare(b.name));
  folder.files.sort((a, b) => a.localeCompare(b));
  for (const sub of folder.subfolders) {
    sortPreviewFolder(sub);
  }
}

// ========== 중복 파일 탐지 ==========

async function getFileHash(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile();
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function findDuplicates(
  files: ScannedFile[],
  onProgress?: (done: number, total: number) => void
): Promise<DuplicateGroup[]> {
  // 1단계: 크기별 그룹핑
  const sizeGroups = new Map<number, ScannedFile[]>();
  for (const f of files) {
    const group = sizeGroups.get(f.size) ?? [];
    group.push(f);
    sizeGroups.set(f.size, group);
  }

  // 2단계: 같은 크기인 파일만 해시 비교
  const candidates = [...sizeGroups.values()].filter((g) => g.length >= 2).flat();
  const hashGroups = new Map<string, ScannedFile[]>();

  for (let i = 0; i < candidates.length; i++) {
    const f = candidates[i];
    const hash = await getFileHash(f.handle);
    const group = hashGroups.get(hash) ?? [];
    group.push(f);
    hashGroups.set(hash, group);
    onProgress?.(i + 1, candidates.length);
  }

  return [...hashGroups.entries()]
    .filter(([, files]) => files.length >= 2)
    .map(([hash, files]) => ({ hash, files }));
}

// ========== 중복 파일 삭제 ==========

export async function deleteDuplicates(
  filesToDelete: ScannedFile[],
  onProgress?: (done: number, total: number) => void
): Promise<{ success: number; errors: number; freedBytes: number; errorMessages: string[] }> {
  let success = 0;
  let errors = 0;
  let freedBytes = 0;
  const errorMessages: string[] = [];

  for (let i = 0; i < filesToDelete.length; i++) {
    const f = filesToDelete[i];
    try {
      await f.parentHandle.removeEntry(f.name);
      freedBytes += f.size;
      success++;
    } catch (e) {
      errors++;
      errorMessages.push(`${f.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
    onProgress?.(i + 1, filesToDelete.length);
  }

  return { success, errors, freedBytes, errorMessages };
}

// ========== 통계 ==========

export function getStats(files: ScannedFile[]) {
  const byCategory = new Map<string, number>();
  let totalSize = 0;

  for (const f of files) {
    byCategory.set(f.category, (byCategory.get(f.category) ?? 0) + 1);
    totalSize += f.size;
  }

  return {
    totalFiles: files.length,
    totalSize,
    byCategory: Object.fromEntries(byCategory),
  };
}
