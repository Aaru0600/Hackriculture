import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

const VARIANTS = {
  primary:
    'bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800',
  secondary:
    'bg-earth-100 text-earth-900 hover:bg-earth-200 active:bg-earth-300',
  outline:
    'border border-brand-600/30 bg-white text-brand-700 hover:bg-brand-50 active:bg-brand-100',
  ghost: 'text-ink/80 hover:bg-black/5 active:bg-black/10',
  white: 'bg-white text-brand-700 shadow-sm hover:bg-brand-50',
  danger: 'bg-danger text-white hover:brightness-95 active:brightness-90',
}

const SIZES = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-5 text-sm gap-2 rounded-xl',
  lg: 'h-13 px-7 text-base gap-2.5 rounded-xl',
}

/**
 * One button for links, router links and actions.
 * Pass `to` for an in-app route, `href` for an external link, otherwise it is a <button>.
 */
export const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    className,
    to,
    href,
    type = 'button',
    fullWidth = false,
    iconLeft,
    iconRight,
    children,
    ...props
  },
  ref,
) {
  const classes = cn(
    'inline-flex select-none items-center justify-center font-semibold transition-colors duration-150',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
    'disabled:cursor-not-allowed disabled:opacity-55',
    VARIANTS[variant],
    SIZES[size],
    fullWidth && 'w-full',
    className,
  )

  const content = (
    <>
      {iconLeft}
      {children}
      {iconRight}
    </>
  )

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...props}>
        {content}
      </Link>
    )
  }
  if (href) {
    return (
      <a
        ref={ref}
        href={href}
        className={classes}
        target={props.target ?? '_blank'}
        rel="noreferrer"
        {...props}
      >
        {content}
      </a>
    )
  }
  return (
    <button ref={ref} type={type} className={classes} {...props}>
      {content}
    </button>
  )
})
