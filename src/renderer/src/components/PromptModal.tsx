import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import Modal from './Modal'

export default function PromptModal(): JSX.Element | null {
  const promptRequest = useAppStore((s) => s.promptRequest)
  const resolvePrompt = useAppStore((s) => s.resolvePrompt)
  const [values, setValues] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!promptRequest) return
    const initial: Record<string, string> = {}
    promptRequest.fields.forEach((f) => {
      initial[f.key] = f.defaultValue ?? ''
    })
    setValues(initial)
  }, [promptRequest])

  if (!promptRequest) return null

  const submit = (): void => resolvePrompt(values)

  return (
    <Modal title={promptRequest.title} onClose={() => resolvePrompt(null)}>
      <div className="prompt-fields">
        {promptRequest.fields.map((f, i) => (
          <label key={f.key} className="prompt-field">
            <span>{f.label}</span>
            <input
              type="text"
              value={values[f.key] ?? ''}
              placeholder={f.placeholder}
              autoFocus={i === 0}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
                if (e.key === 'Escape') resolvePrompt(null)
              }}
            />
          </label>
        ))}
      </div>
      <div className="modal-actions">
        <button className="toolbar-btn" onClick={() => resolvePrompt(null)}>
          Cancel
        </button>
        <button className="toolbar-btn primary" onClick={submit}>
          {promptRequest.confirmLabel ?? 'OK'}
        </button>
      </div>
    </Modal>
  )
}
