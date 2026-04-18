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
        className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-medium py-2"
      >
        ➕ 新增互動（意識流）
      </button>
    )
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="輸入今天的互動…（例：今天拜訪王總，他同意下週給我們報價機會，需要準備 demo）"
        rows={3}
        className="w-full text-sm border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-green-400 resize-none bg-white"
        autoFocus
        disabled={step === 'parsing' || step === 'confirming'}
      />

      {step === 'preview' && parsed && (
        <div className="mt-3 bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-xs font-semibold text-gray-600 mb-2">解析結果：</p>
          <NluPreview parsed={parsed} />
        </div>
      )}

      <div className="flex gap-2 mt-3 justify-end">
        <button onClick={handleCancel} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1">
          取消
        </button>
        {step === 'preview' || step === 'confirming' ? (
          <button
            onClick={handleConfirm}
            disabled={confirmCrm.isPending}
            className="flex items-center gap-1 text-xs bg-green-500 text-white px-4 py-1.5 rounded-lg hover:bg-green-600 disabled:opacity-50"
          >
            {confirmCrm.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            確認寫入
          </button>
        ) : (
          <button
            onClick={handleParse}
            disabled={step === 'parsing' || !text.trim()}
            className="flex items-center gap-1 text-xs bg-green-500 text-white px-4 py-1.5 rounded-lg hover:bg-green-600 disabled:opacity-50"
          >
            {step === 'parsing' ? <Loader2 size={12} className="animate-spin" /> : null}
            🔍 分析
          </button>
        )}
      </div>
    </div>
  )
}
