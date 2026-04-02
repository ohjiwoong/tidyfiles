import { NextRequest, NextResponse } from "next/server";
import { createLicenseToken } from "../../../lib/license-token";

// 테스트용 Pro 활성화 코드 (환경변수로 관리, 없으면 기본값 사용)
const TEST_CODE = process.env.TEST_PRO_CODE ?? "TEST-PRO-2026";

export async function POST(request: NextRequest) {
  const { code } = await request.json();

  if (!code || code !== TEST_CODE) {
    return NextResponse.json({ success: false, message: "Invalid code" }, { status: 400 });
  }

  const token = createLicenseToken(`test_${Date.now()}`);
  return NextResponse.json({ success: true, licenseToken: token });
}
