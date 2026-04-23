import { useState } from 'react'
import { X, Loader2, Check } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useParseCrm, useConfirmCrm, ParsedResult } from '../../api/dealDetail'
import NluPreview from './NluPreview'

interface Props {
  open: boolean
  onClose: () => void
}

type Step = 'input' | 'parsing' | 'preview' | 'confirming'

export default function NluInputModal({ open, onClose }: Props) {
  const [step, setStep] = useState<Step>('input')
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState<ParsedResult | null>(null)
  const qc = useQueryClient()
  const parseCrm = useParseCrm()
  const confirmCrm = useConfirmCrm('__global__')

  if (!open) return null

  const handleClose = () => {
    setText('')
    setParsed(null)
    setStep('input')
    parseCrm.reset()
    confirmCrm.reset()
    onClose()
  }

  const handleParse = async () => {
    if (!text.trim()) return
    setStep('parsing')
    try {
      const res = await parseCrm.mutateAsync({ rawText: text })
      setParsed(res.parsed)
      setStep('preview')
    } catch {
      setStep('input')
    }
  }

  const handleConfirm = async () => {
    if (!parsed) return
    setStep('confirming')
    try {
      await confirmCrm.mutateAsync({ confirmedData: parsed })
      qc.invalidateQueries({ queryKey: ['contacts'] })
      qc.invalidateQueries({ queryKey: ['deals'] })
      handleClose()
    } catch {
      setStep('preview')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      {/* Modal */}
      <div className="relative mx-4 w-full max-w-2xl overflow-hidden rounded-[24px] bg-white shadow-[var(--shadow-popover)]">
        <div className="absolute left-0 right-0 top-0 h-[3px] bg-gradient-to-r from-[color:var(--color-primary)] to-sky-500" />
        <div className="flex items-center justify-between border-b border-[color:var(--color-outline)] px-6 py-4">
          <div>
            <h2 className="display-font text-lg font-bold text-[color:var(--color-text-primary)]">AI 快速記錄</h2>
            <p className="mt-1 text-xs text-[color:var(--color-text-secondary)]/70">說出或貼上拜訪紀錄，AI 自動整理為案件、聯絡人與待辦</p>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="輸入今天的互動、案件更新或待辦…（例：今天拜訪台積電的王總，談到了 Q2 採購計畫，下週需要跟進報價）"
          rows={6}
          disabled={step === 'parsing' || step === 'confirming'}
          autoFocus
          className="w-full resize-none rounded-2xl bg-[color:var(--color-bg-section)] p-4 text-sm leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/30 disabled:bg-slate-50"
        />

        {step === 'preview' && parsed && (
          <div className="mt-4 rounded-2xl bg-[color:var(--color-ai-surface)] p-4">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-sky-600">AI 解析結果</p>
            <NluPreview parsed={parsed} />
          </div>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-semibold text-[color:var(--color-text-secondary)]"
          >
            取消
          </button>
          {step === 'preview' || step === 'confirming' ? (
            <button
              onClick={handleConfirm}
              disabled={confirmCrm.isPending}
              className="flex items-center gap-2 rounded-xl bg-[color:var(--color-primary)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-dark)] disabled:opacity-50"
            >
              {confirmCrm.isPending
                ? <Loader2 size={14} className="animate-spin" />
                : <Check size={14} />}
              確認寫入
            </button>
          ) : (
            <button
              onClick={handleParse}
              disabled={parseCrm.isPending || !text.trim()}
              className="flex items-center gap-2 rounded-xl bg-[color:var(--color-primary)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-dark)] disabled:opacity-50"
            >
              {parseCrm.isPending && <Loader2 size={14} className="animate-spin" />}
              🔍 分析
            </button>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}
