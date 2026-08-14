import { useEffect, useState } from 'react'
import type { ChallengeDay } from '../domain/challenge'
import { MAX_COMMENT_LENGTH } from '../domain/challenge'
import { selectionName, selectionTypeLabel, type DailyEntry, type Selection } from '../domain/types'
import { displayArtwork } from '../services/BangumiImageProxy'
import { imageCompressionService } from '../services/ImageCompressionService'
import { SearchPicker } from './SearchPicker'
import { ManualPicker } from './ManualPicker'

interface Props { day: ChallengeDay; entry: DailyEntry; showCovers: boolean; onChange: (entry: DailyEntry) => void }

export function EntryEditor({ day, entry, showCovers, onChange }: Props) {
  const [mode, setMode] = useState<'search' | 'manual'>(entry.selection?.source === 'manual' ? 'manual' : 'search')
  const setSelection = (selection: Selection) => onChange({ ...entry, selection })
  const setComment = (comment: string) => onChange({ ...entry, comment: comment.slice(0, MAX_COMMENT_LENGTH) })
  return <div className="entry-editor">
    {!entry.selection && mode === 'search' && <SearchPicker onManual={() => setMode('manual')} onChoose={setSelection} />}
    {!entry.selection && mode === 'manual' && <ManualPicker onBack={() => setMode('search')} onChoose={setSelection} />}
    {entry.selection && <Selected selection={entry.selection} showCovers={showCovers} onReplaceImage={(selection) => setSelection(selection)} onClear={() => { onChange({ ...entry, selection: undefined }); setMode('search') }} />}
    <Comment value={entry.comment} onChange={setComment} />
  </div>
}

function Selected({ selection, showCovers, onClear, onReplaceImage }: { selection: Selection; showCovers: boolean; onClear: () => void; onReplaceImage: (selection: Selection) => void }) {
  const [error, setError] = useState('')
  const [failedImageUrl, setFailedImageUrl] = useState<string>()
  const image = displayArtwork(selection)
  useEffect(() => { setFailedImageUrl(undefined) }, [image?.imageUrl])
  const displayImage = image?.imageUrl === failedImageUrl ? undefined : image
  const hasApiArtwork = selection.source === 'bangumi-api' && Boolean(selection.remoteArtwork) && !selection.localArtwork
  async function upload(file?: File) {
    if (!file) return
    try {
      const imageUrl = await imageCompressionService.compress(file)
      const artwork = { imageUrl, alt: selectionName(selection) }
      switch (selection.source) {
        case 'archive': case 'bangumi-api': onReplaceImage({ ...selection, localArtwork: artwork }); break
        case 'music': onReplaceImage({ ...selection, relatedSubject: { ...selection.relatedSubject, artwork } }); break
        case 'bangumi-subject': case 'bangumi-character': case 'manual': onReplaceImage({ ...selection, artwork }); break
      }
      setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : '图片处理失败。') }
  }
  return <section className={`selected-item ${showCovers ? 'with-cover' : 'without-cover'}`}>
    {showCovers && (displayImage ? <img src={displayImage.imageUrl} alt="" onError={() => setFailedImageUrl(displayImage.imageUrl)} /> : <span className="image-fallback">{selectionTypeLabel(selection)}</span>)}
    <div><span className="selection-label">已选择 · {selectionTypeLabel(selection)}</span><strong>{selectionName(selection)}</strong>{'originalName' in selection && selection.originalName && <small>{selection.originalName}</small>}{selection.source === 'music' && selection.credit && <small>{selection.credit}</small>}
      <label className="cover-upload">上传个人图片<input type="file" accept="image/*" onChange={(event) => void upload(event.target.files?.[0])} /></label>
      {!showCovers && <small>{hasApiArtwork ? '已记录 Bangumi 远程封面；开启“显示封面图片”后会尝试显示。' : image ? '图片已保存，开启“显示封面图片”后会显示。' : '可上传个人图片；开启“显示封面图片”后会显示。'}</small>}
      {showCovers && hasApiArtwork && !displayImage && <small className="status">远程封面加载失败；下载海报时会自动使用类型占位卡。</small>}
      {error && <small className="status error">{error}</small>}
    </div><button type="button" className="text-button" onClick={onClear}>更换</button>
  </section>
}

function Comment({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <section className="comment"><label htmlFor="entry-comment">想说的话 <span>（可选，最多 100 字）</span></label><textarea id="entry-comment" value={value} onChange={(event) => onChange(event.target.value)} maxLength={MAX_COMMENT_LENGTH} placeholder="为什么是它？留下些什么给未来的自己。" rows={4} /><div>{value.length} / {MAX_COMMENT_LENGTH}</div></section>
}
