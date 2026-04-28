'use client';

import Link from 'next/link';

import { BookListItem } from '@/lib/book.types';

export default function BookCard({ item, href, extra }: { item: BookListItem; href: string; extra?: React.ReactNode }) {
  return (
    <div className='overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950'>
      <Link href={href}>
        <div className='aspect-[3/4] bg-gray-100 dark:bg-gray-900'>
          {item.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.cover} alt={item.title} className='h-full w-full object-cover' />
          ) : (
            <div className='flex h-full items-center justify-center text-sm text-gray-400'>无封面</div>
          )}
        </div>
      </Link>
      <div className='space-y-2 p-3'>
        <Link href={href} className='line-clamp-2 text-sm font-medium hover:text-sky-600'>{item.title}</Link>
        <div className='line-clamp-1 text-xs text-gray-500 dark:text-gray-400'>{item.author || item.sourceName}</div>
        {extra}
      </div>
    </div>
  );
}
