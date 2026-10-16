import { pb } from "../../lib/pocketbase"

export interface ApplicationRecord {
  id: string
  pdf: string
  fileName: string
  status: "SENDING" | "FAILED" | "SENT"
  signedDate: string
  updated: string
}

export interface ApplicationState {
  today: string
  application: ApplicationRecord | null
}

export const getApplication = () =>
  pb.send<ApplicationState>("/api/bvhub/me/member-application", {
    method: "GET",
  })

export async function submitApplication(
  pdf: Blob,
  signedDate: string,
  fileName: string,
): Promise<ApplicationState> {
  const body = new FormData()
  body.append("pdf", pdf, fileName)
  body.append("signedDate", signedDate)
  return pb.send<ApplicationState>("/api/bvhub/me/member-application", {
    method: "POST",
    body,
  })
}

export const retryApplication = () =>
  pb.send<ApplicationState>("/api/bvhub/me/member-application/retry", {
    method: "POST",
  })

export async function loadApplicationPdf(
  application: ApplicationRecord,
): Promise<Blob> {
  const token = await pb.files.getToken()
  const url = pb.files.getURL(
    { collectionName: "member_applications", id: application.id },
    application.pdf,
    { token },
  )
  const response = await fetch(url)
  if (!response.ok) throw new Error("PDF download failed")
  return response.blob()
}
