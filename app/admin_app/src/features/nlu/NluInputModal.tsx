import { useState } from 'react'
import { X, Loader2, Check } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useParseCrm, useConfirmCrm, ParsedResult } from '../../api/dealDetail'

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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">意識流輸入</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="輸入今天的互動、案件更新或待辦…（例：今天拜訪台積電的王總，談到了 Q2 採購計畫，下週需要跟進報價）"
          rows={6}
          disabled={step === 'parsing' || step === 'confirming'}
          autoFocus
          className="w-full text-sm border border-gray-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-green-400 resize-none disabled:bg-gray-50"
        />

        {step === 'preview' && parsed && (
          <div className="mt-3 bg-gray-50 rounded-xl p-4 text-xs space-y-2">
            <p className="font-semibold text-gray-600 mb-2">📋 解析結果預覽</p>
            {(parsed.pipelines as unknown[]).length > 0 && (
              <div className="text-blue-700">
                <span className="font-medium">📊 案件：</span>
                {(parsed.pipelines as Array<{entity_name?: string}>)
                  .map(p => p.entity_name).filter(Boolean).join('、')}
              </div>
            )}
            {(parsed.interactions as unknown[]).length > 0 && (
              <div className="text-green-700">
                <span className="font-medium">💬 互動：</span>
                {(parsed.interactions as Array<{raw_transcript?: string}>)
                  .map(i => i.raw_transcript?.slice(0, 40)).filter(Boolean).join('；')}
              </div>
            )}
            {(parsed.actions as unknown[]).length > 0 && (
              <div className="text-orange-700">
                <span className="font-medium">✅ 待辦：</span>
                {(parsed.actions as Array<{task_detail?: string}>)
                  .map(a => a.task_detail).filter(Boolean).join('、')}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-end mt-4">
          <button
            onClick={handleClose}
            className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
          >
            取消
          </button>
          {step === 'preview' || step === 'confirming' ? (
            <button
              onClick={handleConfirm}
              disabled={confirmCrm.isPending}
              className="flex items-center gap-2 text-sm bg-green-500 hover:bg-green-600 text-white font-medium px-5 py-2 rounded-xl disabled:opacity-50 transition-colors"
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
              className="flex items-center gap-2 text-sm bg-green-500 hover:bg-green-600 text-white font-medium px-5 py-2 rounded-xl disabled:opacity-50 transition-colors"
            >
              {parseCrm.isPending && <Loader2 size={14} className="animate-spin" />}
              🔍 分析
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
