import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const publicRoutes = ['/login', '/signup', '/auth', '/card']
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )

  // Allow webhook routes without authentication
  const isWebhookRoute = request.nextUrl.pathname.startsWith('/api/webhooks')

  // Allow API routes that need to be public
  const isPublicApiRoute = request.nextUrl.pathname.startsWith('/api/auth')
    || request.nextUrl.pathname.startsWith('/api/og')

  if (
    !user &&
    !isPublicRoute &&
    !isWebhookRoute &&
    !isPublicApiRoute &&
    !request.nextUrl.pathname.startsWith('/_next') &&
    !request.nextUrl.pathname.startsWith('/favicon') &&
    !request.nextUrl.pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If user is logged in and trying to access login/signup, redirect appropriately
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    const inviteToken = request.nextUrl.searchParams.get('invite')
    const url = request.nextUrl.clone()

    if (inviteToken && (request.nextUrl.pathname === '/signup' || request.nextUrl.pathname === '/login')) {
      url.pathname = '/team/accept'
      url.searchParams.set('invite', inviteToken)
    } else {
      url.pathname = '/'
      url.search = ''
    }

    return NextResponse.redirect(url)
  }

  // Onboarding routing for authenticated users (skip for public card pages)
  if (user && !request.nextUrl.pathname.startsWith('/_next') && !request.nextUrl.pathname.startsWith('/api') && !request.nextUrl.pathname.startsWith('/card') && !request.nextUrl.pathname.startsWith('/team/accept')) {
    const isOnboardingRoute = request.nextUrl.pathname.startsWith('/onboarding');

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('onboarding_step')
      .eq('id', user.id)
      .single();

    const onboardingStep = profile?.onboarding_step ?? 'completed';

    if (onboardingStep === 'carousel' && !isOnboardingRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/onboarding';
      return NextResponse.redirect(url);
    }

    if (onboardingStep !== 'carousel' && isOnboardingRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
