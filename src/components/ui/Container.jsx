import { cn } from '@/lib/cn'

/** Page width wrapper - keeps every section aligned to the same gutter. */
export function Container({ as: Tag = 'div', className, children, ...props }) {
  return (
    <Tag className={cn('container-app', className)} {...props}>
      {children}
    </Tag>
  )
}
