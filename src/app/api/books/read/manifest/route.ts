import { NextRequest, NextResponse } from 'next/server';

import { BookAcquisitionLink } from '@/lib/book.types';
import { opdsClient } from '@/lib/opds.client';
import { db } from '@/lib/db';

import { getAuthorizedBooksUsername } from '../../_utils';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const username = await getAuthorizedBooksUsername(request);
  if (username instanceof NextResponse) return username;

  try {
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('sourceId')?.trim();
    const href = searchParams.get('href')?.trim();
    const acquisitionHref = searchParams.get('acquisitionHref')?.trim();
    const format = searchParams.get('format')?.trim() as 'epub' | 'pdf' | null;
    const bookId = searchParams.get('bookId')?.trim();

    if (!sourceId) {
      return NextResponse.json({ error: '缺少 sourceId' }, { status: 400 });
    }

    const existingRecord = bookId ? await db.getBookReadRecord(username, sourceId, bookId) : null;
    const shelfItem = bookId ? await db.getBookShelf(username, sourceId, bookId) : null;
    const resolvedHref = href || existingRecord?.detailHref || shelfItem?.detailHref || '';
    const resolvedAcquisitionHref = acquisitionHref || existingRecord?.acquisitionHref || shelfItem?.acquisitionHref || '';
    const resolvedFormat = format || existingRecord?.format || shelfItem?.format || 'epub';

    if (!resolvedHref && !resolvedAcquisitionHref) {
      return NextResponse.json({ error: '缺少 href / acquisitionHref，且历史记录中也没有可恢复的下载链接' }, { status: 400 });
    }

    const fallbackAcquisitionLinks: BookAcquisitionLink[] = resolvedAcquisitionHref
      ? [{
          rel: 'http://opds-spec.org/acquisition',
          type: resolvedFormat === 'pdf' ? 'application/pdf' : 'application/epub+zip',
          href: resolvedAcquisitionHref,
        }]
      : [];

    const detail = await opdsClient.getBookDetail(sourceId, resolvedHref || '', {
      id: bookId || resolvedAcquisitionHref || undefined,
      title: searchParams.get('title') || existingRecord?.title || shelfItem?.title || undefined,
      author: searchParams.get('author') || existingRecord?.author || shelfItem?.author || undefined,
      cover: searchParams.get('cover') || existingRecord?.cover || shelfItem?.cover || undefined,
      summary: searchParams.get('summary') || undefined,
      detailHref: resolvedHref || undefined,
      acquisitionLinks: fallbackAcquisitionLinks,
    });
    const preferred = resolvedHref
      ? await opdsClient.getPreferredAcquisition(sourceId, resolvedHref)
      : {
          format: resolvedFormat === 'pdf' ? 'pdf' : 'epub',
          href: resolvedAcquisitionHref || '',
        };
    const lastRecord = await db.getBookReadRecord(username, sourceId, detail.id);

    return NextResponse.json({
      book: detail,
      format: preferred.format,
      fileUrl: `/api/books/file?sourceId=${encodeURIComponent(sourceId)}&href=${encodeURIComponent(preferred.href)}`,
      acquisitionHref: preferred.href,
      cacheKey: `${sourceId}::${detail.id}::${preferred.href}`,
      coverUrl: detail.cover,
      lastRecord,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
