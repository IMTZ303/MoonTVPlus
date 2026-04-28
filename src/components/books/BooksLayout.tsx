'use client';

import { BookOpen, ChevronLeft, History, Library, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/books', label: '发现', icon: Library },
  { href: '/books/search', label: '搜索', icon: Search },
  { href: '/books/shelf', label: '书架', icon: BookOpen },
  { href: '/books/history', label: '历史', icon: History },
];

export default function BooksLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isRead = pathname === '/books/read';

  return (
    <div className='min-h-screen bg-gray-50 text-gray-900 dark:bg-black dark:text-gray-100'>
      <header className='fixed inset-x-0 top-0 z-40 border-b border-gray-200/70 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90'>
        <div className='mx-auto flex h-14 max-w-6xl items-center gap-3 px-4'>
          {isRead ? (
            <Link href='/books' className='inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800'>
              <ChevronLeft className='h-5 w-5' />
            </Link>
          ) : (
            <Link href='/' className='text-sm font-semibold text-sky-600'>MoonTV+</Link>
          )}
          <div className='min-w-0 flex-1'>
            <div className='truncate text-sm font-semibold sm:text-base'>{isRead ? '电子书阅读' : '电子书馆'}</div>
            <div className='truncate text-xs text-gray-500 dark:text-gray-400'>OPDS 目录、搜索、阅读与书架</div>
          </div>
          {!isRead && (
            <nav className='hidden items-center gap-2 md:flex'>
              {tabs.map((tab) => {
                const active = pathname === tab.href;
                const Icon = tab.icon;
                return (
                  <Link key={tab.href} href={tab.href} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm ${active ? 'bg-sky-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}>
                    <Icon className='h-4 w-4' />
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </header>
      <main className={`mx-auto max-w-6xl ${isRead ? 'pt-16' : 'px-4 pb-24 pt-20'}`}>{children}</main>
      {!isRead && (
        <nav className='fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-gray-200/70 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95 md:hidden'>
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            const Icon = tab.icon;
            return (
              <Link key={tab.href} href={tab.href} className='flex min-h-16 flex-col items-center justify-center gap-1 text-xs'>
                <Icon className={`h-5 w-5 ${active ? 'text-sky-600' : 'text-gray-500'}`} />
                <span className={active ? 'text-sky-600' : 'text-gray-600 dark:text-gray-300'}>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
