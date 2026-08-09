export function getAuthRedirectPath(pathname: string, authenticated: boolean) {
  // A página de login decide se a identidade também possui um User interno.
  // O middleware conhece apenas a sessão Supabase e não deve causar um loop
  // para uma identidade válida que ainda não tenha autorização Barracar.
  if (pathname === "/login") return null;
  return authenticated ? null : "/login";
}
