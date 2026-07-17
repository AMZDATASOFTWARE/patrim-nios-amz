import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
)

/**
 * @param {React.LabelHTMLAttributes<HTMLLabelElement>} props
 * @param {React.ForwardedRef<HTMLLabelElement>} ref
 */
function LabelBase({ className, ...props }, ref) {
  return (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
  )
}

const Label = React.forwardRef(LabelBase)
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
