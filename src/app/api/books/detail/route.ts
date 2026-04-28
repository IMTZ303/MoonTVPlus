import { NextRequest, NextResponse } from 'next/server';

import { BookAcquisitionLink } from '@/lib/book.types';
import { opdsClient } from '@/lib/opds.client';

import { getAuthorizedBooksUsername } from '../_utils';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const username = await getAuthorizedBooksUsername(request);
  if (username instanceof NextResponse) return username;

  try {
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('sourceId')?.trim();
    const href = searchParams.get('href')?.trim() || '';

    if (!sourceId) {
      return NextResponse.json({ error: '缺少 sourceId' }, { status: 400 });
    }

    const acquisitionLinksRaw = searchParams.get('acquisitionLinks');
    let acquisitionLinks: BookAcquisitionLink[] | undefined;
    if (acquisitionLinksRaw) {
      try {
        acquisitionLinks = JSON.parse(acquisitionLinksRaw) as BookAcquisitionLink[];
      } catch {
        acquisitionLinks = undefined;
      }
    }

    const detail = await opdsClient.getBookDetail(sourceId, href, {
      id: searchParams.get('bookId') || undefined,
      title: searchParams.get('title') || undefined,
      author: searchParams.get('author') || undefined,
      cover: searchParams.get('cover') || undefined,
      summary: searchParams.get('summary') || undefined,
      detailHref: href || undefined,
      acquisitionLinks,
    });
    return NextResponse.json(detail);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
