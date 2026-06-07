import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router"

import type { Route } from "./+types/root"
import "./skafform-theme.css"

export const links: Route.LinksFunction = () => [
  { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
]

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Erreur"
  let details = "Une erreur inattendue s'est produite."

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Erreur"
    details = error.status === 404
      ? "Cette page n'existe pas."
      : error.statusText || details
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message
  }

  return (
    <main style={{ padding: "4rem 2rem", textAlign: "center" }}>
      <h1>{message}</h1>
      <p>{details}</p>
    </main>
  )
}
