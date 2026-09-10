import { cn } from '@/lib/cn'

/** Consistent eyebrow + title + optional lead for every landing section. */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        align === 'center' && 'items-center text-center',
        align === 'left' && 'items-start text-left',
        className,
      )}
    >
      {eyebrow && (
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">
          {eyebrow}
        </span>
      )}
      <h2 className="max-w-2xl text-3xl leading-tight sm:text-4xl">{title}</h2>
      {subtitle && (
        <p className="max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          {subtitle}
        </p>
      )}
    </div>
  )
}
