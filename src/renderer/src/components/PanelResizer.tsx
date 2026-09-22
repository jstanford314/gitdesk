import type { MouseEvent } from 'react'

export default function PanelResizer({ onMouseDown }: { onMouseDown: (e: MouseEvent) => void }): JSX.Element {
  return <div className="panel-resizer" onMouseDown={onMouseDown} />
}
