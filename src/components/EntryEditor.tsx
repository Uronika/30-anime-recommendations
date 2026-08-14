import { useState } from 'react'
import type { ChallengeDay } from '../domain/challenge'
import { MAX_COMMENT_LENGTH } from '../domain/challenge'
import { selectionName, type DailyEntry, type MusicSelection, type Selection } from '../domain/types'
import { SearchPicker } from './SearchPicker'
import { ManualPicker } from './ManualPicker'

interface Props { day: ChallengeDay; entry: DailyEntry; onChange: (entry: DailyEntry) => void }

export function EntryEditor({ day, entry, onChange }: Props) {
  const [mode, setMode] = useState<'search' | 'manual'>(entry.selection?.source === 'manual' ? 'manual' : 'search')
  const [musicTitle, setMusicTitle] = useState(entry.selection?.source === 'music' ? entry.selection.title : '')
  const [musicCredit, setMusicCredit] = useState(entry.selection?.source === 'music' ? entry.selection.credit ?? '' : '')
  const setSelection = (selection: Selection) => onChange({ ...entry, selection })
  const setComment = (comment: string) => onChange({ ...entry, comment: comment.slice(0, MAX_COMMENT_LENGTH) })
  if (day.kind === 'music') {
    const music = entry.selection?.source === 'music' ? entry.selection : undefined
    const applyMusic = (relatedSubject: MusicSelection['relatedSubject']) => setSelection({ source: 'music', title: musicTitle.trim(), credit: musicCredit.trim() || undefined, relatedSubject })
    return <div className="entry-editor"><section className="picker music-form">
      <label htmlFor="music-title">曲目名称</label><input id="music-title" value={musicTitle} onChange={(event) => setMusicTitle(event.target.value)} maxLength={100} placeholder="例如：Brave Shine" />
      <label htmlFor="music-credit">演唱 / 作曲信息（可选）</label><input id="music-credit" value={musicCredit} onChange={(event) => setMusicCredit(event.target.value)} maxLength={100} placeholder="例如：Aimer" />
      <p className="field-note">选择关联动画，海报会使用它的封面。</p>
    </section>
    {musicTitle.trim() && <SearchPicker kind="subject" onManual={() => setMode('manual')} onChoose={(selection) => { if (selection.source === 'bangumi-subject') applyMusic(selection) }} />}
    {mode === 'manual' && <ManualPicker onBack={() => setMode('search')} onChoose={applyMusic} />}
    {music && <Selected selection={music} onClear={() => onChange({ ...entry, selection: undefined })} />}
    <Comment value={entry.comment} onChange={setComment} />
    </div>
  }
  return <div className="entry-editor">
    {!entry.selection && mode === 'search' && <SearchPicker kind={day.kind} onManual={() => setMode('manual')} onChoose={setSelection} />}
    {!entry.selection && mode === 'manual' && <ManualPicker onBack={() => setMode('search')} onChoose={setSelection} />}
    {entry.selection && <Selected selection={entry.selection} onClear={() => { onChange({ ...entry, selection: undefined }); setMode('search') }} />}
    <Comment value={entry.comment} onChange={setComment} />
  </div>
}

function Selected({ selection, onClear }: { selection: Selection; onClear: () => void }) {
  const image = selection.source === 'music' ? selection.relatedSubject.artwork : selection.artwork
  return <section className="selected-item">{image ? <img src={image.imageUrl} alt="" /> : <span className="image-fallback">无图</span>}<div><span className="selection-label">已选择</span><strong>{selectionName(selection)}</strong>{selection.source === 'music' && selection.credit && <small>{selection.credit}</small>}</div><button type="button" className="text-button" onClick={onClear}>更换</button></section>
}

function Comment({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <section className="comment"><label htmlFor="entry-comment">想说的话 <span>（可选，最多 100 字）</span></label><textarea id="entry-comment" value={value} onChange={(event) => onChange(event.target.value)} maxLength={MAX_COMMENT_LENGTH} placeholder="为什么是它？留下些什么给未来的自己。" rows={4} /><div>{value.length} / {MAX_COMMENT_LENGTH}</div></section>
}
