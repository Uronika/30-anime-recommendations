import { useEffect, useState } from 'react'
import { bangumiRepository, type SearchResult } from '../services/BangumiRepository'
import type { BangumiCharacterSelection, BangumiSubjectSelection } from '../domain/types'

interface Props {
  kind: 'subject' | 'character'
  onChoose: (selection: BangumiSubjectSelection | BangumiCharacterSelection) => void
  onManual: () => void
}

export function SearchPicker({ kind, onChoose, onManual }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (!query.trim()) { setResults([]); return }
      setLoading(true); setError('')
      try { setResults(kind === 'subject' ? await bangumiRepository.searchSubjects(query) : await bangumiRepository.searchCharacters(query)) }
      catch (cause) { setResults([]); setError(cause instanceof Error ? cause.message : '搜索失败。') }
      finally { setLoading(false) }
    }, 350)
    return () => window.clearTimeout(timer)
  }, [kind, query])

  return <section className="picker" aria-label="搜索 Bangumi 数据库">
    <label htmlFor="bangumi-search">在 Bangumi 搜索{kind === 'subject' ? '动画' : '角色'}</label>
    <input id="bangumi-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={kind === 'subject' ? '例如：葬送的芙莉莲' : '例如：江户川柯南'} autoComplete="off" />
    {loading && <p className="status">正在检索…</p>}
    {error && <p className="status error" role="alert">{error}</p>}
    {results.length > 0 && <ul className="search-results">
      {results.map((result) => <li key={result.id}><button type="button" onClick={() => onChoose(kind === 'subject' ? bangumiRepository.toSubject(result) : bangumiRepository.toCharacter(result))}>
        <img src={result.imageUrl} alt="" /><span><strong>{result.name}</strong>{result.originalName && <small>{result.originalName}</small>}</span>
      </button></li>)}
    </ul>}
    {query && !loading && !results.length && !error && <p className="status">没有匹配结果，也可以手工填写。</p>}
    <button type="button" className="text-button" onClick={onManual}>没有找到？手工填写</button>
  </section>
}
