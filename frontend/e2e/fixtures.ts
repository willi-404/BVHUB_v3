import { test as base, expect } from "@playwright/test"

export const test = base.extend<{ draftId: string }>({
  draftId: async ({}, use) => {
    const id = process.env.PW_DRAFT_ID
    test.skip(!id, "Set PW_DRAFT_ID when running against an isolated seeded PocketBase")
    await use(id as string)
  },
})

export { expect }
