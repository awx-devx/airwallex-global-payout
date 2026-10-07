import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { advanceRouteEnabled } from '@/server/demo-access'

function isGated(pathname: string): boolean {
  return (
    pathname === '/dev' ||
    pathname.startsWith('/dev/') ||
    pathname === '/api/demo' ||
    pathname.startsWith('/api/demo/')
  )
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const sandboxAdvance =
    /^\/api\/demo\/runs\/[^/]+\/advance$/.test(pathname) && advanceRouteEnabled()
  if (isGated(pathname) && process.env.DEMO_MODE !== 'true' && !sandboxAdvance) {
    return new NextResponse('Not found', { status: 404 })
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/dev/:path*', '/api/demo/:path*'],
}
