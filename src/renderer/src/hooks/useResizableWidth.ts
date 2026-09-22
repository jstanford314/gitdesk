import type { MouseEvent as ReactMouseEvent } from 'react'

/**
 * Drags a CSS custom property (set on the document root) between min/max,
 * writing straight to the DOM during the drag instead of React state so
 * resizing stays smooth, then persists the final value to localStorage.
 * Components read the width via `var(--foo, <fallback>)` in CSS, so no
 * prop-drilling is needed to keep multiple panels (e.g. the file list in
 * both ChangesView and CommitDetailsView) in sync.
 */
export function useResizableWidth(cssVar: string, storageKey: string, min: number, max: number) {
  return (e: ReactMouseEvent): void => {
    e.preventDefault()
    const root = document.documentElement
    const current = parseInt(getComputedStyle(root).getPropertyValue(cssVar), 10)
    const startWidth = Number.isFinite(current) ? current : min
    const startX = e.clientX

    const onMove = (ev: globalThis.MouseEvent): void => {
      const next = Math.min(max, Math.max(min, startWidth + (ev.clientX - startX)))
      root.style.setProperty(cssVar, `${next}px`)
    }
    const onUp = (): void => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      try {
        localStorage.setItem(storageKey, root.style.getPropertyValue(cssVar))
      } catch {
        // best-effort only
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }
}

export function restoreResizableWidths(pairs: [storageKey: string, cssVar: string][]): void {
  const root = document.documentElement
  for (const [storageKey, cssVar] of pairs) {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) root.style.setProperty(cssVar, saved)
    } catch {
      // best-effort only
    }
  }
}
