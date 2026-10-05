import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function isGated(pathname: string): boolean {
  return (
    pathname === '/dev' ||
    pathname.startsWith('/dev/') ||
    pathname === '/api/demo' ||
    pathname.startsWith('/api/demo/')
  )
}

export function proxy(request: NextRequest) {
  if (isGated(request.nextUrl.pathname) && process.env.DEMO_MODE !== 'true') {
    return new NextResponse('Not found', { status: 404 })
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/dev/:path*', '/api/demo/:path*'],
}
