import { cn } from '@/lib/cn'

/**
 * Base surface used across the product (dashboard KPI cards, result panels...).
 * `hover` adds the subtle lift used on interactive cards.
 */
export function Card({ as: Tag = 'div', hover = false, className, children, ...props }) {
  return (
    <Tag
      className={cn(
        'card p-5 sm:p-6',
        hover &&
          'transition-transform transition-shadow duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  )
}
