import { useEffect, useRef, useState } from "react"
import { ZoomIn, ZoomOut } from "lucide-react"
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from "pdfjs-dist"
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"

GlobalWorkerOptions.workerSrc = workerUrl

function PdfPage({
  document,
  number,
  zoom,
}: {
  document: PDFDocumentProxy
  number: number
  zoom: number
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const node = canvas.current
    const container = node?.parentElement
    if (!node || !container) return
    let stopped = false
    let renderTask: ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]> | null =
      null
    const draw = async () => {
      const page = await document.getPage(number)
      if (stopped) return
      const unscaled = page.getViewport({ scale: 1 })
      const width = Math.min(container.clientWidth, 595) * zoom
      const viewport = page.getViewport({ scale: width / unscaled.width })
      const pixelRatio = window.devicePixelRatio || 1
      node.width = Math.ceil(viewport.width * pixelRatio)
      node.height = Math.ceil(viewport.height * pixelRatio)
      node.style.width = `${viewport.width}px`
      node.style.height = `${viewport.height}px`
      const context = node.getContext("2d")
      if (!context) return
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      renderTask = page.render({ canvasContext: context, viewport })
      await renderTask.promise
    }
    void draw().catch((error) => {
      if (!stopped) console.error("PDF preview failed", error)
    })
    return () => {
      stopped = true
      renderTask?.cancel()
    }
  }, [document, number, zoom])
  return (
    <div className="w-full max-w-[595px] bg-white shadow-sm">
      <canvas
        ref={canvas}
        role="img"
        aria-label={`PDF page ${number}`}
        className="block"
      />
    </div>
  )
}

export default function PdfPreview({
  pdf,
  title,
}: {
  pdf: Blob
  title: string
}) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null)
  const [zoom, setZoom] = useState(1)
  useEffect(() => {
    let active = true
    let task: ReturnType<typeof getDocument> | null = null
    setDocument(null)
    void pdf
      .arrayBuffer()
      .then((buffer) => {
        if (!active) return null
        task = getDocument({ data: buffer })
        return task.promise
      })
      .then((value) => {
        if (active && value) setDocument(value)
      })
      .catch((error) => {
        if (active) console.error("PDF preview failed", error)
      })
    return () => {
      active = false
      void task?.destroy()
    }
  }, [pdf])
  return (
    <section
      aria-label={title}
      className="border border-[var(--border)] bg-neutral-100"
    >
      <div className="flex justify-end gap-1 border-b border-[var(--border)] bg-[var(--card)] p-1">
        <button
          type="button"
          aria-label="Zoom out PDF"
          title="Zoom out PDF"
          disabled={zoom <= 1}
          onClick={() => setZoom((value) => Math.max(1, value - 0.5))}
          className="flex size-10 items-center justify-center rounded hover:bg-[var(--muted)] disabled:opacity-40"
        >
          <ZoomOut size={18} />
        </button>
        <button
          type="button"
          aria-label="Zoom in PDF"
          title="Zoom in PDF"
          disabled={zoom >= 2}
          onClick={() => setZoom((value) => Math.min(2, value + 0.5))}
          className="flex size-10 items-center justify-center rounded hover:bg-[var(--muted)] disabled:opacity-40"
        >
          <ZoomIn size={18} />
        </button>
      </div>
      <div className="max-h-[70vh] min-h-[420px] space-y-4 overflow-auto p-2 sm:p-4">
        {document &&
          Array.from({ length: document.numPages }, (_, index) => (
            <PdfPage
              key={index}
              document={document}
              number={index + 1}
              zoom={zoom}
            />
          ))}
      </div>
    </section>
  )
}
