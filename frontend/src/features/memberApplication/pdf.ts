import { PDFDocument } from "pdf-lib"
import type { ProfileDto } from "../profile/types"

// shortcut: The PDF is a committed export of the ODT, regenerate it whenever the ODT changes.
const TEMPLATE = "/Aufnahmeantrag_muster_15Okt2026.pdf"

function textImage(text: string, maxWidth: number): string {
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas is unavailable")
  let fontSize = 12
  while (fontSize > 7) {
    context.font = `${fontSize * 2}px Arial, sans-serif`
    if (context.measureText(text).width <= maxWidth * 2) break
    fontSize -= 0.5
  }
  canvas.width = Math.ceil(maxWidth * 2)
  canvas.height = 36
  context.font = `${fontSize * 2}px Arial, sans-serif`
  context.fillStyle = "#1d4ed8"
  context.textBaseline = "middle"
  context.fillText(text, 0, 18, canvas.width)
  return canvas.toDataURL("image/png")
}

export async function createApplicationPdf(
  profile: ProfileDto,
  bank: {
    institute: string
    iban: string
    bic: string
  },
  signedDate: string,
  signature?: string,
): Promise<Blob> {
  if (!profile.profile) throw new Error("Profile is incomplete")
  const response = await fetch(TEMPLATE)
  if (!response.ok) throw new Error("PDF template is unavailable")
  const document = await PDFDocument.load(await response.arrayBuffer())
  if (document.getPageCount() !== 6)
    throw new Error("Unexpected PDF template version")
  const [first] = document.getPages()
  const last = document.getPage(5)
  const add = async (
    page: typeof first,
    text: string,
    x: number,
    top: number,
    width = 340,
  ) => {
    const image = await document.embedPng(textImage(text, width))
    page.drawImage(image, {
      x,
      y: page.getHeight() - top - 18,
      width,
      height: 18,
    })
  }
  await add(first, profile.user.firstName, 175, 148)
  await add(first, profile.user.lastName, 175, 172)
  await add(
    first,
    profile.profile.birthDate.split("-").reverse().join("."),
    175,
    196,
  )
  await add(
    first,
    `${profile.profile.street} ${profile.profile.houseNumber}`,
    175,
    219,
  )
  await add(first, profile.profile.postalCode, 175, 243)
  await add(first, profile.profile.city, 175, 267)
  await add(first, profile.user.email, 175, 291)
  await add(first, bank.institute, 195, 540, 320)
  await add(first, bank.iban, 115, 571, 400)
  await add(first, bank.bic, 115, 603, 400)
  await add(
    last,
    `Erlangen, ${signedDate.split("-").reverse().join(".")}`,
    170,
    582,
  )
  if (signature) {
    const image = await document.embedPng(signature)
    last.drawImage(image, {
      x: 170,
      y: last.getHeight() - 658,
      width: 210,
      height: 45,
    })
  }
  return new Blob([new Uint8Array(await document.save())], {
    type: "application/pdf",
  })
}
