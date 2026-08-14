export type EntryKind = 'catalog'

export interface ChallengeDay {
  day: number
  title: string
  kind: EntryKind
}

const titles = [
  '第一部动画', '入坑动画', '童年动画', '必看神作', '最喜欢的动画',
  '最喜欢的角色', '最喜欢的女主', '最喜欢的男主', '最喜欢的反派', '最喜欢的群像作品',
  '最好的原创动画', '最好的改编动画', '最好的漫画改动画', '最好的轻小说改动画', '最好的剧场版动画',
  '最好的TV动画', '最好的短篇动画', '最好的长篇动画', '最好的动画电影', '最想推荐给别人的动画',
  '最冷门但优秀的动画', '被低估的动画', '被高估的动画', '最遗憾的动画', '最想重制的动画',
  '最期待续作的动画', '最震撼的动画体验', '最喜欢的动画音乐', '陪伴你最久的动画', '影响你最大的动画',
]

export const CHALLENGE_DAYS: readonly ChallengeDay[] = titles.map((title, index) => ({
  day: index + 1,
  title,
  kind: 'catalog',
}))

export const MAX_COMMENT_LENGTH = 100
