declare module "virtual:skafform/server-init" {}

interface SkafformNavItem {
  label: string
  href: string
  visibility: "public" | "guest" | "authenticated" | "admin"
  order: number
  brick: string
}

declare module "virtual:skafform/nav" {
  const nav: Record<string, SkafformNavItem[]>
  export default nav
}

declare module "virtual:skafform/config" {
  const config: Record<string, unknown>
  export default config
}

