import { Outlet, NavLink, useLoaderData } from "react-router"
import type { LoaderFunctionArgs } from "react-router"
import config from "virtual:skafform/config"
import navRegistry from "virtual:skafform/nav"

export async function loader({ request }: LoaderFunctionArgs) {
  let role = "public"
  try {
    const { getAdapter } = await import("@skafform/core/runtime")
    const user = await getAdapter().getSession(request)
    role = user?.role ?? "public"
  } catch {
    // aucun adapter enregistré
  }
  return { role }
}

function filterByRole(items: SkafformNavItem[], role: string) {
  return items.filter(item => {
    if (item.visibility === "public") return true
    if (item.visibility === "guest") return role === "public"
    if (item.visibility === "authenticated") return role !== "public"
    if (item.visibility === "admin") return role === "admin"
    return true
  })
}

export default function DefaultLayout() {
  const { role } = useLoaderData() as { role: string }
  const logo = (config as any).customize?.navbar?.logo ?? "Site"

  const primaryLinks  = filterByRole(navRegistry["primary"]   ?? [], role)
  const userMenuLinks = filterByRole(navRegistry["user-menu"] ?? [], role)
  const footerLinks   = filterByRole(navRegistry["footer"]    ?? [], role)

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--skafform-background)",
      fontFamily: "var(--skafform-font)",
    }}>
      <nav style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--skafform-spacing-lg)",
        padding: "0 var(--skafform-spacing-xl)",
        height: "var(--skafform-navbar-height)",
        background: "var(--skafform-background)",
        borderBottom: "1px solid var(--skafform-border)",
        boxShadow: "var(--skafform-shadow-sm)",
      }}>
        <strong style={{ color: "var(--skafform-primary)", fontSize: "var(--skafform-font-size-lg)", marginRight: "var(--skafform-spacing-md)" }}>
          {logo}
        </strong>

        {primaryLinks.map(item => (
          <NavLink key={item.href} to={item.href} end style={({ isActive }) => ({
            textDecoration: "none",
            fontSize: "var(--skafform-font-size-sm)",
            color: isActive ? "var(--skafform-foreground)" : "var(--skafform-muted-fg)",
            fontWeight: isActive ? 600 : 400,
          })}>
            {item.label}
          </NavLink>
        ))}

        <div style={{ marginLeft: "auto", display: "flex", gap: "var(--skafform-spacing-md)" }}>
          {userMenuLinks.map(item => (
            <NavLink key={item.href} to={item.href} end style={({ isActive }) => ({
              textDecoration: "none",
              fontSize: "var(--skafform-font-size-sm)",
              color: isActive ? "var(--skafform-foreground)" : "var(--skafform-muted-fg)",
              fontWeight: isActive ? 600 : 400,
            })}>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main><Outlet /></main>

      {footerLinks.length > 0 && (
        <footer style={{
          borderTop: "1px solid var(--skafform-border)",
          padding: "var(--skafform-spacing-lg) var(--skafform-spacing-xl)",
          display: "flex",
          gap: "var(--skafform-spacing-lg)",
        }}>
          {footerLinks.map(item => (
            <NavLink key={item.href} to={item.href} end style={{ textDecoration: "none", fontSize: "var(--skafform-font-size-sm)", color: "var(--skafform-muted-fg)" }}>
              {item.label}
            </NavLink>
          ))}
        </footer>
      )}
    </div>
  )
}
