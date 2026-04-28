'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { BookDetail, BookShelfItem } from '@/lib/book.types';
import { deleteBookShelf, getAllBookShelf, saveBookShelf } from '@/lib/book.db.client';

function DetailSkeleton() {
  return (
    <div className='space-y-6 animate-pulse'>
      <section className='grid gap-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950 md:grid-cols-[220px_1fr]'>
        <div className='aspect-[3/4] rounded-3xl bg-gray-200 dark:bg-gray-800' />
        <div className='space-y-4'>
          <div className='h-8 w-2/3 rounded bg-gray-200 dark:bg-gray-800' />
          <div className='h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-800' />
          <div className='space-y-2'>
            <div className='h-4 w-full rounded bg-gray-200 dark:bg-gray-800' />
            <div className='h-4 w-11/12 rounded bg-gray-200 dark:bg-gray-800' />
            <div className='h-4 w-10/12 rounded bg-gray-200 dark:bg-gray-800' />
          </div>
          <div className='flex gap-3'>
            <div className='h-10 w-24 rounded-2xl bg-gray-200 dark:bg-gray-800' />
            <div className='h-10 w-24 rounded-2xl bg-gray-200 dark:bg-gray-800' />
          </div>
        </div>
      </section>
    </div>
  );
}

export default function BookDetailPage() {
  const searchParams = useSearchParams();
  const sourceId = searchParams.get('sourceId') || '';
  const href = searchParams.get('href') || '';
  const [detail, setDetail] = useState<BookDetail | null>(null);
  const [shelf, setShelf] = useState<Record<string, BookShelfItem>>({});
  const [error, setError] = useState('');


  useEffect(() => {
    getAllBookShelf().then(setShelf).catch(() => undefined);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    fetch(`/api/books/detail?${params.toString()}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || '获取详情失败');
        setDetail(json);
      })
      .catch((err) => setError(err.message || '获取详情失败'));
  }, [searchParams]);

  const toggleShelf = async () => {
    if (!detail) return;
    const bookKey = `${detail.sourceId}+${detail.id}`;
    if (shelf[bookKey]) {
      await deleteBookShelf(detail.sourceId, detail.id);
      setShelf((prev) => {
        const next = { ...prev };
        delete next[bookKey];
        return next;
      });
      return;
    }
    const item: BookShelfItem = {
      sourceId: detail.sourceId,
      sourceName: detail.sourceName,
      bookId: detail.id,
      title: detail.title,
      author: detail.author,
      cover: detail.cover,
      detailHref: detail.detailHref,
      acquisitionHref: readable?.href,
      saveTime: Date.now(),
    };
    await saveBookShelf(detail.sourceId, detail.id, item);
    setShelf((prev) => ({ ...prev, [bookKey]: item }));
  };

  if (error) return <div className='text-sm text-red-500'>{error}</div>;
  if (!detail) return <DetailSkeleton />;

  const readable = detail.acquisitionLinks.find((item) => item.type.toLowerCase().includes('epub') || item.type.toLowerCase().includes('pdf'));
  const readableFormat = readable?.type.toLowerCase().includes('pdf') ? 'pdf' : 'epub';

  return (
    <div className='space-y-6'>
      <section className='grid gap-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950 md:grid-cols-[220px_1fr]'>
        <div className='overflow-hidden rounded-3xl bg-gray-100 dark:bg-gray-900'>
          {detail.cover ? <img src={detail.cover} alt={detail.title} className='h-full w-full object-cover' /> : <div className='flex aspect-[3/4] items-center justify-center text-sm text-gray-400'>无封面</div>}
        </div>
        <div className='space-y-4'>
          <div>
            <h1 className='text-2xl font-semibold'>{detail.title}</h1>
            <div className='mt-2 text-sm text-gray-500 dark:text-gray-400'>{detail.author || detail.sourceName}</div>
          </div>
          {detail.summary ? <div className='text-sm leading-7 text-gray-700 dark:text-gray-300'>{detail.summary}</div> : null}
          <div className='flex flex-wrap gap-2'>
            {(detail.categories || detail.tags || []).map((tag) => <span key={tag} className='rounded-full bg-gray-100 px-3 py-1 text-xs dark:bg-gray-900'>{tag}</span>)}
          </div>
          <div className='flex flex-wrap gap-3'>
            {readable ? <Link href={`/books/read?sourceId=${encodeURIComponent(sourceId)}&href=${encodeURIComponent(href || detail.detailHref || '')}&acquisitionHref=${encodeURIComponent(readable.href)}&format=${encodeURIComponent(readableFormat)}&bookId=${encodeURIComponent(detail.id)}&title=${encodeURIComponent(detail.title)}&author=${encodeURIComponent(detail.author || '')}&cover=${encodeURIComponent(detail.cover || '')}`} className='rounded-2xl bg-sky-600 px-4 py-2 text-sm text-white'>在线阅读</Link> : null}
            <button onClick={toggleShelf} className='rounded-2xl border border-gray-200 px-4 py-2 text-sm dark:border-gray-700'>{shelf[`${detail.sourceId}+${detail.id}`] ? '移出书架' : '加入书架'}</button>
            {detail.acquisitionLinks[0] ? <a href={`/api/books/file?sourceId=${encodeURIComponent(sourceId)}&href=${encodeURIComponent(detail.acquisitionLinks[0].href)}`} target='_blank' rel='noreferrer' className='rounded-2xl border border-gray-200 px-4 py-2 text-sm dark:border-gray-700'>下载文件</a> : null}
          </div>
        </div>
      </section>
      <section className='rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950'>
        <h2 className='text-lg font-semibold'>可用格式</h2>
        <div className='mt-4 space-y-3'>
          {detail.acquisitionLinks.map((item) => (
            <div key={`${item.href}-${item.type}`} className='flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 text-sm dark:bg-gray-900'>
              <div>
                <div>{item.title || item.type}</div>
                <div className='text-xs text-gray-500'>{item.rel}</div>
              </div>
              <a href={`/api/books/file?sourceId=${encodeURIComponent(sourceId)}&href=${encodeURIComponent(item.href)}`} target='_blank' rel='noreferrer' className='text-sky-600'>打开</a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
