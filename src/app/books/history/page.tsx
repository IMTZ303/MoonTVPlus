'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { deleteBookReadRecord, getAllBookReadRecords, getAllBookShelf } from '@/lib/book.db.client';
import { BookReadRecord, BookShelfItem } from '@/lib/book.types';

export default function BookHistoryPage() {
  const [records, setRecords] = useState<Record<string, BookReadRecord>>({});
  const [shelf, setShelf] = useState<Record<string, BookShelfItem>>({});

  useEffect(() => {
    getAllBookReadRecords().then(setRecords).catch(() => undefined);
    getAllBookShelf().then(setShelf).catch(() => undefined);
  }, []);

  const items = useMemo(() => Object.entries(records)
    .map(([key, item]) => {
      const [fallbackSourceId = '', fallbackBookId = ''] = key.split('+');
      const shelfItem = shelf[key];
      return {
        ...item,
        storageKey: key,
        sourceId: item.sourceId || shelfItem?.sourceId || fallbackSourceId,
        bookId: item.bookId || shelfItem?.bookId || fallbackBookId,
        sourceName: item.sourceName || shelfItem?.sourceName || '',
        detailHref: item.detailHref || shelfItem?.detailHref,
        acquisitionHref: item.acquisitionHref || shelfItem?.acquisitionHref,
        cover: item.cover || shelfItem?.cover,
        author: item.author || shelfItem?.author,
        format: item.format || shelfItem?.format || 'epub',
      };
    })
    .sort((a, b) => b.saveTime - a.saveTime), [records, shelf]);

  return (
    <div className='space-y-4'>
      {items.map((item) => (
        <div key={item.storageKey} className='rounded-3xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950'>
          <div className='flex gap-4'>
            <div className='h-28 w-20 overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-900'>{item.cover ? <img src={item.cover} alt={item.title} className='h-full w-full object-cover' /> : null}</div>
            <div className='min-w-0 flex-1'>
              <div className='truncate font-medium'>{item.title}</div>
              <div className='mt-1 text-sm text-gray-500'>{item.author || item.sourceName}</div>
              <div className='mt-1 text-xs text-gray-500'>已读 {Math.round(item.progressPercent || 0)}% · {item.chapterTitle || item.locator.chapterTitle || '定位已保存'}</div>
              <div className='mt-3 flex flex-wrap gap-2'>
                {item.sourceId ? (
                  <Link
                    href={{
                      pathname: '/books/read',
                      query: {
                        sourceId: item.sourceId,
                        href: item.detailHref || '',
                        acquisitionHref: item.acquisitionHref || '',
                        format: item.format,
                        bookId: item.bookId,
                        title: item.title,
                        author: item.author || '',
                        cover: item.cover || '',
                      },
                    }}
                    className='rounded-2xl bg-sky-600 px-3 py-2 text-xs text-white'
                  >
                    继续阅读
                  </Link>
                ) : (
                  <span className='rounded-2xl bg-gray-200 px-3 py-2 text-xs text-gray-500 dark:bg-gray-800'>历史记录缺少书源信息</span>
                )}
                <button onClick={async () => { const [deleteSourceId = item.sourceId, deleteBookId = item.bookId] = item.storageKey.split('+'); await deleteBookReadRecord(deleteSourceId, deleteBookId); setRecords((prev) => { const next = { ...prev }; delete next[item.storageKey]; return next; }); }} className='rounded-2xl border border-gray-200 px-3 py-2 text-xs dark:border-gray-700'>删除</button>
              </div>
            </div>
          </div>
        </div>
      ))}
      {items.length === 0 ? <div className='text-sm text-gray-500'>暂无阅读历史</div> : null}
    </div>
  );
}
