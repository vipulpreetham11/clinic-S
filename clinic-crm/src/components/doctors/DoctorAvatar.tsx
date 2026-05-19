import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

type AvatarSize = 'sm' | 'md' | 'lg'

interface DoctorAvatarProps {
  doctor: {
    name: string
    photo_url?: string | null
    is_active: boolean
  }
  size?: AvatarSize
  className?: string
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function stringToHslColor(value: string) {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = Math.abs(hash) % 360
  return `hsl(${h} 45% 78%)`
}

const sizeMap: Record<AvatarSize, 'sm' | 'default' | 'lg'> = {
  sm: 'sm',
  md: 'default',
  lg: 'lg',
}

const sizeClass: Record<AvatarSize, string> = {
  sm: 'size-8',
  md: 'size-12',
  lg: 'size-20',
}

export function DoctorAvatar({ doctor, size = 'md', className }: DoctorAvatarProps) {
  const initials = getInitials(doctor.name)
  const fallbackColor = stringToHslColor(doctor.name)

  return (
    <Avatar size={sizeMap[size]} className={cn(sizeClass[size], className)}>
      {doctor.photo_url && <AvatarImage src={doctor.photo_url} alt={doctor.name} />}
      <AvatarFallback style={{ backgroundColor: fallbackColor }}>
        {initials}
      </AvatarFallback>
      <AvatarBadge className={doctor.is_active ? 'bg-emerald-500' : 'bg-muted-foreground'} />
    </Avatar>
  )
}
