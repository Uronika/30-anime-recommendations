import { useEffect, useState } from 'react'
import { selectionTypeLabel, type CatalogSelection } from '../domain/types'
import { catalogRepository } from '../services/CatalogRepository'
import type { CatalogueSearchResult, IndexProgress } from '../services/ArchiveRepository'

interface Props {
  onChoose: (selection: CatalogSelection) => void
  onManual: () => void
}

export function SearchPicker({ onChoose, onManual }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CatalogueSearchResult[]>([])
  const [visible, setVisible] = useState(20)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [choosing, setChoosing] = useState<number>()
  const [progress, setProgress] = useState<IndexProgress>()
  const [sourceNote, setSourceNote] = useState('')
  const [directApi, setDirectApi] = useState(false)

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(async () => {
      if (!query.trim()) { setResults([]); setProgress(undefined); setError(''); setSourceNote(''); return }
      setLoading(true); setError(''); setVisible(20); setProgress(undefined); setSourceNote('')
      try {
        const response = await catalogRepository.search(query, {
          mode: directApi ? 'api-only' : 'archive-first',
          onProgress: (next) => { if (!cancelled) setProgress(next) },
        })
        if (cancelled) return
        setResults(response.results)
        if (response.state === 'api-direct') {
          setSourceNote('已直接使用 Bangumi 官方 API；本次搜索未加载离线资料库。')
        } else if (response.state === 'online-fallback') {
          setSourceNote(response.archiveError ? '离线资料库暂时不可用，正在显示 Bangumi 官方 API 的在线补充。' : 'Archive 快照没有匹配结果，正在显示 Bangumi 官方 API 的在线补充。')
        }
      } catch (cause) {
        if (!cancelled) { setResults([]); setError(cause instanceof Error ? cause.message : '搜索失败。') }
      } finally { if (!cancelled) setLoading(false) }
    }, 350)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [query, directApi])

  function toggleDirectApi(enabled: boolean) {
    setDirectApi(enabled)
    setResults([])
    setVisible(20)
    setError('')
    setProgress(undefined)
    setSourceNote('')
  }

  async function choose(result: CatalogueSearchResult) {
    setChoosing(result.id)
    try { onChoose(await catalogRepository.select(result)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : '无法读取该条目详情。') }
    finally { setChoosing(undefined) }
  }

  return <section className="picker" aria-label="目录搜索">
    <label htmlFor="catalog-search">搜索动画、作品或角色</label>
    <input id="catalog-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例如：葬送的芙莉莲、火影忍者、Frieren" autoComplete="off" />
    <label className="api-search-toggle">
      <input type="checkbox" checked={directApi} onChange={(event) => toggleDirectApi(event.target.checked)} />
      <span><strong>直接使用 Bangumi 官方 API</strong><small>跳过离线资料库；适合已能直连 Bangumi 或不想等待资料库准备时使用。</small></span>
    </label>
    {progress && loading && <p className="status" role="status">正在准备离线资料库：{progress.completed} / {progress.total} 个搜索分片{progress.cached ? '（读取本机缓存）' : ''}</p>}
    {loading && !progress && <p className="status" role="status">正在准备离线资料库…</p>}
    {sourceNote && <p className="status">{sourceNote}</p>}
    {error && <p className="status error" role="alert">{error}</p>}
    {results.length > 0 && <ul className="search-results">
      {results.slice(0, visible).map((result) => <li key={`${result.source}-${result.kind}-${result.id}`}><button type="button" disabled={choosing === result.id} onClick={() => void choose(result)}>
        <span><strong>{result.name}</strong>{result.originalName && <small>{result.originalName}</small>}<em>{selectionTypeLabel(result)} · {result.source === 'archive' ? `Archive 快照${result.snapshot ? ` · ${result.snapshot}` : ''}` : '在线补充'}</em></span>
      </button></li>)}
    </ul>}
    {results.length > visible && <button type="button" className="secondary load-more" onClick={() => setVisible((count) => count + 20)}>加载更多（剩余 {results.length - visible} 条）</button>}
    {query && !loading && !results.length && !error && <p className="status">没有匹配结果，也可以手工填写。</p>}
    <button type="button" className="text-button" onClick={onManual}>没有找到？手工填写</button>
    <footer className="source-footer">资料来源：{directApi ? <>本次直接连接 <code>api.bgm.tv</code> 官方 API，不加载离线资料库。</> : <>Bangumi Archive 固定快照；仅在快照零命中或加载失败时连接 <code>api.bgm.tv</code> 官方 API。静态资料库不会写入备份文件。</>}</footer>
  </section>
}
