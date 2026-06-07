import type { EntryContext } from "react-router"
import { ServerRouter } from "react-router"
import { renderToReadableStream } from "react-dom/server"
import "virtual:skafform/server-init"

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
): Promise<Response> {
  const stream = await renderToReadableStream(
    <ServerRouter context={routerContext} url={request.url} />,
    {
      onError(error: unknown) {
        console.error(error)
        responseStatusCode = 500
      },
    }
  )

  responseHeaders.set("Content-Type", "text/html")

  return new Response(stream, {
    status: responseStatusCode,
    headers: responseHeaders,
  })
}
