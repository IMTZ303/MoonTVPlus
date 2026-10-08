/* eslint-disable @typescript-eslint/no-explicit-any */

import { HttpsProxyAgent } from 'https-proxy-agent';
import { NextResponse } from 'next/server';
import nodeFetch from 'node-fetch';


export const runtime = 'nodejs';

function isCloudflareEnvironment(): boolean {
  return (
    process.env.CF_PAGES === '1' || process.env.BUILD_TARGET === 'cloudflare'
  );
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}





async function fetchImage(
  imageUrl: string,
  options?: { source?: string }
): Promise<Response> {

  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    Referer: 'https://movie.douban.com/',
  };

  const config = null;
  const targetUrl = imageUrl;



  const proxy = '';
  const fetchOptions: any = {
    headers,
    signal: AbortSignal.timeout(proxy ? 30000 : 15000),
  };

  if (proxy) {
    fetchOptions.agent = new HttpsProxyAgent(proxy);
  }

  return nodeFetch(targetUrl, fetchOptions) as unknown as Promise<Response>;
}

// OrionTV 兼容接口
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');
  const source = searchParams.get('source') || undefined;

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing image URL' }, { status: 400 });
  }

  try {
    const imageResponse = await fetchImage(imageUrl, { source });

    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: imageResponse.statusText },
        { status: imageResponse.status }
      );
    }

    const contentType = imageResponse.headers.get('content-type');

    if (!imageResponse.body) {
      return NextResponse.json(
        { error: 'Image response has no body' },
        { status: 500 }
      );
    }

    // 创建响应头
    const headers = new Headers();
    if (contentType) {
      headers.set('Content-Type', contentType);
    }

    // 设置缓存头（可选）
    headers.set('Cache-Control', 'public, max-age=15720000, s-maxage=15720000'); // 缓存半年
    headers.set('CDN-Cache-Control', 'public, s-maxage=15720000');
    headers.set('Vercel-CDN-Cache-Control', 'public, s-maxage=15720000');
    headers.set('Netlify-Vary', 'query');

    // 直接返回图片流
    return new Response(imageResponse.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('图片代理请求失败:', error);
    return NextResponse.json(
      { error: 'Error fetching image' },
      { status: 500 }
    );
  }
}
