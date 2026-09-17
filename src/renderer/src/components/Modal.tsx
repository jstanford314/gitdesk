import type { ReactNode } from 'react'

export default function Modal({
  title,
  onClose,
  children
}: {
  title: string
  onClose: () => void
  children: ReactNode
}): JSX.Element {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>{title}</span>
          <button className="icon-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
