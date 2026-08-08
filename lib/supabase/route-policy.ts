export function getAuthRedirectPath(pathname: string, authenticated: boolean) {
  if (pathname === "/login") return authenticated ? "/auth-test" : null;
  return authenticated ? null : "/login";
}
