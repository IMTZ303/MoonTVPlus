'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import BookCard from '@/components/books/BookCard';
import { BookListItem, BookSearchResult, BookSource } from '@/lib/book.types';

function detailHref(item: BookListItem) {
  const params = new URLSearchParams({
    sourceId: item.sourceId,
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

function SearchSkeleton() {
  return (
    <div className='grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6 animate-pulse'>
      {Array.from({ length: 12 }).map((_, index) => (
        <div key={index} className='space-y-3'>
          <div className='aspect-[3/4] rounded-2xl bg-gray-200 dark:bg-gray-800' />
          <div className='h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800' />
          <div className='h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-800' />
        </div>
      ))}
    </div>
  );
}

export default function BooksSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [sourceId, setSourceId] = useState(searchParams.get('sourceId') || '');
  const [sources, setSources] = useState<BookSource[]>([]);
  const [result, setResult] = useState<BookSearchResult>({ results: [], failedSources: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/books/sources').then((res) => res.json()).then((json) => setSources(json.sources || []));
  }, []);

  useEffect(() => {
    const keyword = searchParams.get('q') || '';
    const source = searchParams.get('sourceId') || '';
    setQ(keyword);
    setSourceId(source);
    if (!keyword) return;
    setLoading(true);
    fetch(`/api/books/search?${new URLSearchParams({ q: keyword, ...(source ? { sourceId: source } : {}) }).toString()}`)
      .then((res) => res.json())
      .then((json) => setResult(json))
      .finally(() => setLoading(false));
  }, [searchParams]);

  return (
    <div className='space-y-6'>
      <section className='rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950'>
        <form onSubmit={(e) => { e.preventDefault(); const params = new URLSearchParams(); if (q.trim()) params.set('q', q.trim()); if (sourceId) params.set('sourceId', sourceId); router.push(`/books/search?${params.toString()}`); }} className='space-y-3'>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder='搜索书名 / 作者' className='w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none dark:border-gray-700 dark:bg-gray-900' />
          <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className='w-full rounded-2xl border border-gray-200 px-4 py-3 dark:border-gray-700 dark:bg-gray-900'>
            <option value=''>全部书源</option>
            {sources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
          </select>
          <button className='rounded-2xl bg-sky-600 px-4 py-2 text-sm text-white'>搜索</button>
        </form>
      </section>
      {loading ? <SearchSkeleton /> : null}
      {result.failedSources.length > 0 ? <div className='rounded-2xl bg-amber-50 p-4 text-sm text-amber-700 dark:bg-amber-950/20 dark:text-amber-300'>{result.failedSources.map((item) => `${item.sourceName}: ${item.error}`).join('；')}</div> : null}
      <section className='grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6'>
        {result.results.map((item) => <BookCard key={`${item.sourceId}-${item.id}`} item={item} href={detailHref(item)} />)}
      </section>
      {!loading && result.results.length === 0 ? <div className='text-sm text-gray-500'>暂无结果</div> : null}
    </div>
  );
}
