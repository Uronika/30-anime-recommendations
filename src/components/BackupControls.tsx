import { migrateProfile, type ChallengeProfile } from '../domain/types'

export function BackupControls({ profile, onImport }: { profile: ChallengeProfile; onImport: (profile: ChallengeProfile) => void }) {
  function download() { const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' }); const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(blob); anchor.download = '30部动漫推荐-备份.json'; anchor.click(); setTimeout(() => URL.revokeObjectURL(anchor.href), 1000) }
  async function upload(file?: File) { if (!file) return; try { onImport(migrateProfile(JSON.parse(await file.text()))) } catch { window.alert('无法读取该备份文件。') } }
  return <div className="backup-controls"><button className="secondary" type="button" onClick={download}>导出备份</button><label className="secondary upload-control">导入备份<input type="file" accept="application/json" onChange={(event) => upload(event.target.files?.[0])} /></label></div>
}
