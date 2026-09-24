import assert from "node:assert/strict"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const { parseFeed } = require("../pocketbase/pb_hooks/news-service.js")

const xml = `<rss><channel>
  <item><title>Tom &amp; Jerry</title><link>https://bv-erlangen2025.de/zh/posts/sommer/</link><pubDate>2026-09-01</pubDate><description><![CDATA[<p>Short &amp; clear</p>]]></description></item>
  <item><title>External</title><link>https://example.com/zh/posts/nope</link></item>
  <item><title>Wrong language</title><link>https://bv-erlangen2025.de/de/posts/falsch</link></item>
</channel></rss>`

assert.deepEqual(parseFeed(xml, "zh"), [{
  locale: "zh",
  slug: "sommer",
  title: "Tom & Jerry",
  link: "https://bv-erlangen2025.de/zh/posts/sommer/",
  publishedAt: "2026-09-01",
  excerpt: "Short & clear",
}])
assert.throws(() => parseFeed("<rss><channel /></rss>", "zh"))
console.log("news parser self-check passed")
