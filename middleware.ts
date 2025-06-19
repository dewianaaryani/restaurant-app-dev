import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
    cookieName:
      process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
  });
  // console.log("User Token:", token);

  // console.log(`User ${token?.email || "anonymous"} accessing ${pathname}`);

  // Route configurations
  const routes = {
    public: ["/"],
    auth: ["/login", "/register"],
    protected: ["/profile", "/kitchen", "/cashier", "/tables"],
    admin: ["/admin"],
    customer: ["/orders", "/menu"],
    kitchen: ["/kitchen"],
    cashier: ["/cashier"],
  };

  // Check route types
  const isPublicRoute =
    routes.public.includes(pathname) || pathname.startsWith("/api/auth");
  const isAuthRoute = routes.auth.some((route) => pathname.startsWith(route));
  const isProtectedRoute = routes.protected.some((route) =>
    pathname.startsWith(route)
  );
  const isAdminRoute = routes.admin.some((route) => pathname.startsWith(route));
  const isCustomerRoute = routes.customer.some((route) =>
    pathname.startsWith(route)
  );

  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }
  function getRoleBasedRedirect(role: string | undefined): string {
    switch (role) {
      case "admin":
        return "/admin";
      case "customer":
        return "/menu";
      default:
        return "/";
    }
  }
  console.log("TOKEN:", token);
  console.log("isAuthRoute:", isAuthRoute);
  // Redirect authenticated users away from auth pages
  if (isAuthRoute && token) {
    console.log("Redirecting from auth route:", pathname, "Role:", token.role);
    const roleBasedRedirect = getRoleBasedRedirect(token.role);
    return NextResponse.redirect(new URL(roleBasedRedirect, request.url));
  }
  // All protected routes require authentication
  const requiresAuth = isProtectedRoute || isAdminRoute || isCustomerRoute;

  if (!token && requiresAuth) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based access control for authenticated users
  if (token && requiresAuth) {
    if (isAdminRoute && token.role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    if (isCustomerRoute && token.role !== "customer") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  return NextResponse.next();
}
