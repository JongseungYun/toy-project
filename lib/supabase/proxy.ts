import { createServerClient } from "@supabase/ssr";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

// 로그인하지 않아도 열리는 곳. 공유 링크는 받은 사람이 계정 없이 여는 화면이다.
const OPEN_PATHS = ["/login", "/signup", "/auth", "/share"];

// 이미 로그인한 사람이 다시 볼 이유가 없는 곳. 들어오면 보관함으로 보낸다.
// 공유 링크는 여기 없다. 내 계정으로 로그인한 채 남의 링크를 열 수 있어야 한다.
const ENTRY_PATHS = ["/login", "/signup"];

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isOpen = OPEN_PATHS.some((path) => pathname.startsWith(path));
  const isEntry = ENTRY_PATHS.some((path) => pathname.startsWith(path));
  const authHeaders = new Headers();
  let supabaseResponse = NextResponse.next({
    request,
  });

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          for (const [name, value] of Object.entries(headers)) {
            authHeaders.set(name, value);
          }
        },
      },
    },
  );

  let signedIn = false;
  if (isOpen && !isEntry) {
    await supabase.auth.getClaims();
  } else {
    // 비밀번호 재설정으로 세션이 종료돼도 기존 JWT 서명은 만료 전까지 유효하다.
    const { data, error } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
    if (isAuthRetryableFetchError(error)) {
      // 일시적인 Auth 장애에는 서명을 확인해 로그인 화면으로 되돌리지 않는다.
      signedIn = Boolean((await supabase.auth.getClaims()).data?.claims);
    }
  }

  let response = supabaseResponse;
  if (!signedIn && !isOpen) {
    if (pathname.startsWith("/api/")) {
      response = NextResponse.json({ code: "loginRequired" }, {
        status: 401, headers: { "Cache-Control": "private, no-store" },
      });
    } else {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      response = NextResponse.redirect(url);
    }
  } else if (signedIn && isEntry) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    response = NextResponse.redirect(url);
  }

  if (response !== supabaseResponse) {
    // 세션을 갱신하거나 지운 응답은 리다이렉트에도 쿠키를 넘긴다.
    for (const cookie of supabaseResponse.cookies.getAll()) {
      response.cookies.set(cookie);
    }
  }
  authHeaders.forEach((value, name) => response.headers.set(name, value));
  return response;
}
