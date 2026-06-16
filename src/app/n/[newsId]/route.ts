import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ newsId: string }> }
) {
  const { newsId } = await params;
  return NextResponse.redirect(new URL(`/noticias/${newsId}`, request.url));
}
