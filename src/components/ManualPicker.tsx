import { useState } from 'react'
import { imageCompressionService } from '../services/ImageCompressionService'
import type { ManualSelection } from '../domain/types'

export function ManualPicker({ onChoose, onBack }: { onChoose: (selection: ManualSelection) => void; onBack: () => void }) {
  const [name, setName] = useState(''); const [image, setImage] = useState<string>(); const [error, setError] = useState('')
  async function handleImage(file?: File) { if (!file) return; try { setImage(await imageCompressionService.compress(file)); setError('') } catch (cause) { setError(cause instanceof Error ? cause.message : '图片处理失败。') } }
  return <section className="picker">
    <label htmlFor="manual-name">名称</label><input id="manual-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="填写动画、角色或作品名称" />
    <label htmlFor="manual-image">自定义图片（可选）</label><input id="manual-image" type="file" accept="image/*" onChange={(event) => handleImage(event.target.files?.[0])} />
    {image && <img className="manual-preview" src={image} alt="已选择的自定义图片预览" />}{error && <p className="status error">{error}</p>}
    <div className="button-row"><button type="button" className="secondary" onClick={onBack}>返回搜索</button><button type="button" disabled={!name.trim()} onClick={() => onChoose({ source: 'manual', name: name.trim(), artwork: image ? { imageUrl: image, alt: name.trim() } : undefined })}>使用此条目</button></div>
  </section>
}
