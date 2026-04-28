'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import BookCard from '@/components/books/BookCard';
import { BookCatalogResult, BookListItem, BookSource } from '@/lib/book.types';

function makeHref(sourceId: string, item: BookListItem) {
  const params = new URLSearchParams({
    sourceId,
    href: item.detailHref || '',
    bookId: item.id,
    title: item.title,
    author: item.author || '',
    cover: item.cover || '',
    summary: item.summary || '',
    acquisitionLinks: JSON.stringify(item.acquisitionLinks || []),
  });
  return `/books/detail?${params.toString()}`;
}

function CatalogSkeleton() {
  return (
    <div className='space-y-6 animate-pulse'>
      <div className='flex gap-2 overflow-x-auto pb-1'>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className='h-10 w-24 rounded-full bg-gray-200 dark:bg-gray-800' />
        ))}
      </div>
      <div className='rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950'>
        <div className='h-6 w-40 rounded bg-gray-200 dark:bg-gray-800' />
        <div className='mt-3 h-4 w-72 rounded bg-gray-200 dark:bg-gray-800' />
      </div>
      <div className='flex gap-3 overflow-x-auto pb-2'>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className='h-20 min-w-[180px] rounded-2xl bg-gray-200 dark:bg-gray-800' />
        ))}
      </div>
      <div className='grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6'>
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className='space-y-3'>
            <div className='aspect-[3/4] rounded-2xl bg-gray-200 dark:bg-gray-800' />
            <div className='h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800' />
            <div className='h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-800' />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BooksCatalogPage() {
  const searchParams = useSearchParams();
  const sourceId = searchParams.get('sourceId') || '';
  const href = searchParams.get('href') || '';
  const [sources, setSources] = useState<BookSource[]>([]);
  const [data, setData] = useState<BookCatalogResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/books/sources').then((res) => res.json()).then((json) => setSources(json.sources || []));
  }, []);

  useEffect(() => {
    if (!sourceId) return;
    const params = new URLSearchParams({ sourceId });
    if (href) params.set('href', href);
    fetch(`/api/books/catalog?${params.toString()}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || '获取目录失败');
        setData(json);
      })
      .catch((err) => setError(err.message || '获取目录失败'));
  }, [sourceId, href]);

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap gap-2'>
        {sources.map((source) => (
          <Link key={source.id} href={`/books/catalog?sourceId=${encodeURIComponent(source.id)}`} className={`rounded-full px-4 py-2 text-sm ${source.id === sourceId ? 'bg-sky-600 text-white' : 'border border-gray-200 dark:border-gray-700'}`}>
            {source.name}
          </Link>
        ))}
      </div>
      {error ? <div className='text-sm text-red-500'>{error}</div> : null}
      {data ? (
        <>
          <section className='rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950'>
            <h1 className='text-lg font-semibold'>{data.title}</h1>
            {data.subtitle ? <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>{data.subtitle}</p> : null}
            <div className='mt-4 flex flex-wrap gap-2'>
              {data.previousHref ? <Link href={`/books/catalog?sourceId=${encodeURIComponent(sourceId)}&href=${encodeURIComponent(data.previousHref)}`} className='rounded-2xl border border-gray-200 px-4 py-2 text-sm dark:border-gray-700'>上一页</Link> : null}
              {data.nextHref ? <Link href={`/books/catalog?sourceId=${encodeURIComponent(sourceId)}&href=${encodeURIComponent(data.nextHref)}`} className='rounded-2xl border border-gray-200 px-4 py-2 text-sm dark:border-gray-700'>下一页</Link> : null}
            </div>
          </section>
          {data.navigation.length > 0 ? (
            <section className='space-y-3'>
              <div className='text-sm font-medium text-gray-700 dark:text-gray-300'>目录</div>
              <div className='flex gap-3 overflow-x-auto pb-2'>
                {data.navigation.map((item, index) => (
                  <Link
                    key={`${item.href}-${index}`}
                    href={`/books/catalog?sourceId=${encodeURIComponent(sourceId)}&href=${encodeURIComponent(item.href)}`}
                    className='min-w-[180px] rounded-2xl border border-gray-200 bg-white p-4 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-950'
                  >
                    <div className='line-clamp-2 font-medium'>{item.title}</div>
                    <div className='mt-2 text-xs text-gray-500 dark:text-gray-400'>点击进入子目录</div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
          <section className='grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6'>
            {data.entries.map((item) => <BookCard key={`${item.sourceId}-${item.id}`} item={item} href={makeHref(sourceId, item)} />)}
          </section>
        </>
      ) : !error ? <CatalogSkeleton /> : null}
    </div>
  );
}
