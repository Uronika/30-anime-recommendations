import type { ChallengeProfile } from '../domain/types'

export function ProfileBar({ profile, onChange }: { profile: ChallengeProfile; onChange: (profile: ChallengeProfile) => void }) {
  return <section className="profile-bar" aria-label="海报署名"><div><label htmlFor="nickname">你的昵称</label><input id="nickname" value={profile.nickname} onChange={(event) => onChange({ ...profile, nickname: event.target.value.slice(0, 30) })} placeholder="例如：小满" /></div><div><label htmlFor="subtitle">海报副标题</label><input id="subtitle" value={profile.subtitle} onChange={(event) => onChange({ ...profile, subtitle: event.target.value.slice(0, 60) })} placeholder="留给未来自己的动画档案" /></div><label className="cover-toggle"><input type="checkbox" checked={profile.showCovers} onChange={(event) => onChange({ ...profile, showCovers: event.target.checked })} />显示封面图片 <small>默认关闭；开启后优先使用你的本地图片。</small></label></section>
}
