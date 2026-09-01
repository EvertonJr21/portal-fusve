import { useState, type ReactNode } from 'react'

export type UploadStatus = { state: 'idle' | 'processing' | 'done' | 'error'; message?: string }

interface UploadCardProps {
  title: string
  description: string
  filenameHint: string
  accept: string
  accentClass: string
  icon: ReactNode
  status: UploadStatus
  disabled: boolean
  onFile: (file: File) => void
}

const STATUS_LABEL: Record<UploadStatus['state'], string> = {
  idle: '',
  processing: 'Processando…',
  done: 'Concluído',
  error: 'Falhou',
}

const STATUS_BADGE_CLASS: Record<UploadStatus['state'], string> = {
  idle: '',
  processing: 'bg-status-blue-bg text-status-blue',
  done: 'bg-status-green-bg text-status-green',
  error: 'bg-status-red-bg text-status-red',
}

export function UploadCard({ title, description, filenameHint, accept, accentClass, icon, status, disabled, onFile }: UploadCardProps) {
  const [arrastando, setArrastando] = useState(false)

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (file) onFile(file)
  }

  return (
    <div
      onDragOver={(e) => {
        if (disabled) return
        e.preventDefault()
        setArrastando(true)
      }}
      onDragLeave={() => setArrastando(false)}
      onDrop={(e) => {
        e.preventDefault()
        setArrastando(false)
        if (!disabled) handleFiles(e.dataTransfer.files)
      }}
      className={`group relative flex flex-col gap-3 rounded-xl border p-4 transition-all duration-200 ${
        arrastando
          ? 'border-blue-400 bg-blue-50/60 shadow-soft-md'
          : status.state === 'error'
            ? 'border-status-red/40 bg-status-red-bg/30'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-soft-sm'
      } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${accentClass}`}>{icon}</div>
        {status.state !== 'idle' && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE_CLASS[status.state]}`}
          >
            {status.state === 'processing' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-blue" />}
            {STATUS_LABEL[status.state]}
          </span>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>

      <label
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-3 py-4 text-center transition-colors ${
          arrastando ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-slate-50 group-hover:border-slate-400'
        } ${disabled ? 'cursor-not-allowed' : ''}`}
      >
        <input
          type="file"
          accept={accept}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5 text-slate-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L7 9m5-5l5 5M5 20h14" />
        </svg>
        <span className="text-xs font-medium text-slate-600">
          <span className="text-blue-700 group-hover:underline">Escolher arquivo</span> ou arraste aqui
        </span>
        <span className="text-[11px] text-slate-400">{filenameHint}</span>
      </label>

      {status.message && (
        <p className={`text-xs ${status.state === 'error' ? 'text-status-red' : 'text-slate-500'}`}>{status.message}</p>
      )}
    </div>
  )
}
