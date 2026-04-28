import { NextRequest, NextResponse } from 'next/server';

import { opdsClient } from '@/lib/opds.client';

import { getAuthorizedBooksUsername } from '../_utils';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const username = await getAuthorizedBooksUsername(request);
  if (username instanceof NextResponse) return username;

  try {
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('sourceId')?.trim();
    const href = searchParams.get('href')?.trim();
    if (!sourceId || !href) {
      return NextResponse.json({ error: '缺少 sourceId 或 href' }, { status: 400 });
    }

    const source = await opdsClient.getSourceById(sourceId);
    const headers = new Headers();
    if (source.authMode === 'basic' && source.username) {
      headers.set('Authorization', `Basic ${Buffer.from(`${source.username}:${source.password || ''}`).toString('base64')}`);
    } else if (source.authMode === 'header' && source.headerName && source.headerValue) {
      headers.set(source.headerName, source.headerValue);
    }
    const range = request.headers.get('range');
    if (range) headers.set('Range', range);

    const response = await fetch(href, {
      headers,
      redirect: 'follow',
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json({ error: `文件代理失败: ${response.status}` }, { status: response.status });
    }

    const outHeaders = new Headers();
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    const acceptRanges = response.headers.get('accept-ranges');
    const contentRange = response.headers.get('content-range');
    const disposition = response.headers.get('content-disposition');
    if (contentType) outHeaders.set('Content-Type', contentType);
    if (contentLength) outHeaders.set('Content-Length', contentLength);
    if (acceptRanges) outHeaders.set('Accept-Ranges', acceptRanges);
    if (contentRange) outHeaders.set('Content-Range', contentRange);
    if (disposition) outHeaders.set('Content-Disposition', disposition);
    outHeaders.set('Cache-Control', 'private, max-age=300');

    return new NextResponse(response.body, {
      status: response.status,
      headers: outHeaders,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
