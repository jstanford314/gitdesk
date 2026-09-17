export function relativeTime(iso: string): string {
  const date = new Date(iso)
  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.round(days / 30)
  if (months < 12) return `${months}mo ago`
  const years = Math.round(months / 12)
  return `${years}y ago`
}

export function shortHash(hash: string): string {
  return hash.slice(0, 7)
}

const LANE_COLORS = ['#5865f2', '#23a55a', '#f0b132', '#f23f43', '#eb459e', '#00a8fc', '#f47b67', '#949cf7']

export function laneColor(lane: number): string {
  return LANE_COLORS[lane % LANE_COLORS.length]
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}
