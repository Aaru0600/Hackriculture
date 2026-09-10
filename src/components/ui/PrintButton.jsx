import { useTranslation } from 'react-i18next'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/Button'

/**
 * "Print / Save as PDF". Triggers the browser print dialog; the `@media print`
 * rules in index.css hide the app chrome and print only `.printable` content.
 * Wrap the section you want on paper in `<div className="printable">`.
 */
export function PrintButton({ label, variant = 'outline', size = 'sm', className }) {
  const { t } = useTranslation()
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => window.print()}
      iconLeft={<Printer size={15} />}
    >
      {label || t('common.printReport')}
    </Button>
  )
}
