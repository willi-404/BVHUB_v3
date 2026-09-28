import { readFile } from "node:fs/promises"
import { createServer } from "node:http"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const port = Number(process.argv[2] || process.env.NEWS_FIXTURE_PORT)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("NEWS_FIXTURE_PORT must be a valid port")

const root = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "news")
const paths = {
  "/zh/posts/index.xml": join(root, "zh", "posts", "index.xml"),
  "/de/posts/index.xml": join(root, "de", "posts", "index.xml"),
}

const server = createServer(async (request, response) => {
  const file = paths[request.url]
  if (!file) {
    response.writeHead(404)
    response.end()
    return
  }
  try {
    response.writeHead(200, { "content-type": "application/rss+xml; charset=utf-8" })
    response.end(await readFile(file))
  } catch {
    response.writeHead(500)
    response.end()
  }
})

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`News feed fixture listening on ${port}\n`)
})

function stop() {
  server.close(() => process.exit(0))
}

process.on("SIGTERM", stop)
process.on("SIGINT", stop)
