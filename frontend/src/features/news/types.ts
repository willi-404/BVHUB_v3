export type NewsLocale = "zh" | "de"

export type NewsPost = {
  id: string
  locale: NewsLocale
  slug: string
  title: string
  link: string
  publishedAt: string
  excerpt: string
}

export type NewsSlot = { position: number; slug: string | null }
export type NewsLocaleAdmin = { locale: NewsLocale; posts: NewsPost[]; slots: NewsSlot[] }
export type AdminNewsResponse = { locales: NewsLocaleAdmin[] }
