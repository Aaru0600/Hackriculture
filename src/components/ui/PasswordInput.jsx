import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { FormInput } from './FormInput'

/** FormInput with a show/hide toggle. */
export const PasswordInput = forwardRef(function PasswordInput(
  { toggleLabel = 'Show password', ...props },
  ref,
) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <FormInput ref={ref} type={visible ? 'text' : 'password'} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={toggleLabel}
        aria-pressed={visible}
        className="absolute right-3 top-[34px] grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-black/5"
        tabIndex={-1}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
})
