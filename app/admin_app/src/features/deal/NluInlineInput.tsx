import { useState } from 'react'
import { Loader2, Check } from 'lucide-react'
import { useParseCrm, useConfirmCrm, ContextHint, ParsedResult } from '../../api/dealDetail'
import NluPreview from '../nlu/NluPreview'

interface Props {
  dealId: string
  contextHint?: ContextHint
  onSuccess?: () => void
}

type Step = 'idle' | 'input' | 'parsing' | 'preview' | 'confirming'

export default function NluInlineInput({ dealId, contextHint, onSuccess }: Props) {
  const [step, setStep] = useState<Step>('idle')
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState<ParsedResult | null>(null)
  const parseCrm = useParseCrm()
  const confirmCrm = useConfirmCrm(dealId)

  const handleParse = async () => {
    if (!text.trim()) return
    setStep('parsing')
    try {
      const res = await parseCrm.mutateAsync({ rawText: text, contextHint })
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
      await confirmCrm.mutateAsync({ confirmedData: parsed, contextHint })
      setText('')
      setParsed(null)
      setStep('idle')
      onSuccess?.()
    } catch {
      setStep('preview')
    }
  }

  const handleCancel = () => {
    setText('')
    setParsed(null)
    setStep('idle')
  }

  if (step === 'idle') {
    return (
      <button
        onClick={() => setStep('input')}
        className="mb-4 inline-flex items-center gap-2 rounded-full bg-[color:var(--color-primary-light)] px-4 py-2 text-sm font-semibold text-[color:var(--color-primary-dark)]"
      >
        ➕ 新增互動（意識流）
      </button>
    )
  }

  return (
    <div className="mb-4 rounded-[20px] border border-emerald-200 bg-gradient-to-r from-emerald-50 to-sky-50 p-4">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="輸入今天的互動…（例：今天拜訪王總，他同意下週給我們報價機會，需要準備 demo）"
        rows={3}
        className="w-full resize-none rounded-2xl border border-[color:var(--color-outline)] bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/30"
        autoFocus
        disabled={step === 'parsing' || step === 'confirming'}
      />

      {step === 'preview' && parsed && (
        <div className="mt-3 rounded-2xl border border-white/80 bg-white/90 p-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-sky-600">解析結果</p>
          <NluPreview parsed={parsed} />
        </div>
      )}

      <div className="mt-3 flex justify-end gap-2">
        <button onClick={handleCancel} className="px-3 py-1 text-xs font-semibold text-[color:var(--color-text-secondary)]/70">
          取消
        </button>
        {step === 'preview' || step === 'confirming' ? (
          <button
            onClick={handleConfirm}
            disabled={confirmCrm.isPending}
            className="flex items-center gap-1 rounded-lg bg-[color:var(--color-primary)] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[color:var(--color-primary-dark)] disabled:opacity-50"
          >
            {confirmCrm.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            確認寫入
          </button>
        ) : (
          <button
            onClick={handleParse}
            disabled={step === 'parsing' || !text.trim()}
            className="flex items-center gap-1 rounded-lg bg-[color:var(--color-primary)] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[color:var(--color-primary-dark)] disabled:opacity-50"
          >
            {step === 'parsing' ? <Loader2 size={12} className="animate-spin" /> : null}
            🔍 分析
          </button>
        )}
      </div>
    </div>
  )
}
