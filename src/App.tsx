import { useEffect, useMemo, useState } from 'react'
import { BackupControls } from './components/BackupControls'
import { EntryEditor } from './components/EntryEditor'
import { ProfileBar } from './components/ProfileBar'
import { CHALLENGE_DAYS } from './domain/challenge'
import { createEmptyProfile, migrateProfile, selectionName, type ChallengeProfile, type DailyEntry } from './domain/types'
import { challengeRepository } from './services/ChallengeRepository'
import { archiveRepository } from './services/ArchiveRepository'
import { posterRenderer } from './services/PosterRenderer'

export default function App() {
  const [profile, setProfile] = useState<ChallengeProfile>(createEmptyProfile()); const [currentDay, setCurrentDay] = useState(1); const [ready, setReady] = useState(false); const [exporting, setExporting] = useState(false); const [notice, setNotice] = useState('')
  useEffect(() => { challengeRepository.load().then((saved) => { setProfile(saved); setReady(true) }).catch(() => setReady(true)) }, [])
  useEffect(() => { if (ready) void challengeRepository.save(profile) }, [profile, ready])
  const day = CHALLENGE_DAYS[currentDay - 1]; const entry = profile.entries[currentDay - 1]
  const completed = useMemo(() => profile.entries.filter((item) => item.selection).length, [profile])
  function updateEntry(next: DailyEntry) { setProfile((prior) => ({ ...prior, entries: prior.entries.map((item) => item.day === next.day ? next : item) })) }
  async function exportPoster() { setExporting(true); setNotice('正在合成高清海报…'); try { await posterRenderer.download(profile); setNotice('PNG 已开始下载。') } catch (cause) { setNotice(cause instanceof Error ? cause.message : '海报导出失败。') } finally { setExporting(false) } }
  async function importProfile(next: ChallengeProfile) { try { const migrated = migrateProfile(next); await challengeRepository.replace(migrated); setProfile(migrated); setNotice('备份已恢复。') } catch (cause) { setNotice(cause instanceof Error ? cause.message : '备份不兼容。') } }
  async function clearArchive() { if (!window.confirm('这会清除本机档案与离线资料库缓存，已导出的备份不会受影响。确定继续吗？')) return; await challengeRepository.clear(); archiveRepository.resetMemoryCache(); setProfile(createEmptyProfile()); setCurrentDay(1); setNotice('本机档案和离线资料库缓存已清除。') }
  if (!ready) return <main className="loading-screen">正在打开你的动画档案…</main>
  return <main><header className="app-header"><div><p className="brand-mark">30部动漫推荐</p><h1>把动画记忆，整理成一张档案。</h1><p>30 个题目，随时填写。所有内容只保存在你的浏览器。</p></div><div className="header-actions"><BackupControls profile={profile} onImport={importProfile} /><button type="button" onClick={exportPoster} disabled={exporting}>{exporting ? '正在生成…' : '下载 5×6 PNG'}</button></div></header>
  <ProfileBar profile={profile} onChange={setProfile} />
  <section className="progress-section"><div className="progress-copy"><strong>{completed} / 30</strong><span>已填写</span></div><div className="progress-track" aria-label={`已完成 ${completed} 题，共 30 题`}><span style={{ width: `${completed / 30 * 100}%` }} /></div></section>
  <nav className="day-nav" aria-label="选择 Day">{CHALLENGE_DAYS.map((item) => <button key={item.day} type="button" className={`${item.day === currentDay ? 'active' : ''} ${profile.entries[item.day - 1].selection ? 'complete' : ''}`} onClick={() => setCurrentDay(item.day)} aria-current={item.day === currentDay ? 'step' : undefined}>D{item.day}</button>)}</nav>
  <section className="editor-shell"><div className="day-heading"><span>DAY {String(day.day).padStart(2, '0')}</span><h2>{day.title}</h2><p>从 Bangumi Archive 选择动画、作品或角色，也可以手工记录。</p></div><EntryEditor day={day} entry={entry} showCovers={profile.showCovers} onChange={updateEntry} /><div className="editor-footer"><button type="button" className="secondary" disabled={currentDay === 1} onClick={() => setCurrentDay((value) => value - 1)}>上一题</button><span>{selectionName(entry.selection) ? '已自动保存' : '等待你的选择'}</span><button type="button" className="secondary" disabled={currentDay === 30} onClick={() => setCurrentDay((value) => value + 1)}>下一题</button></div></section>
  <section className="about-source" aria-label="关于资料来源"><h2>关于资料来源</h2><p>主源为 Bangumi Archive 固定快照 <code>dump-2026-08-11.210343Z.zip</code>。只发布派生搜索与详情分片；静态零命中或资料库加载失败时，才直连 <code>api.bgm.tv</code> 获取在线补充。来源信息不会写入导出的海报。</p></section>
  <footer className="app-footer"><span>资料来源：Bangumi Archive 固定快照与失败时的 Bangumi 官方 API 在线补充。</span><button type="button" className="text-button danger-button" onClick={() => void clearArchive()}>清除本机档案与资料库缓存</button></footer>
  {notice && <p className="toast" role="status">{notice}</p>}</main>
}
