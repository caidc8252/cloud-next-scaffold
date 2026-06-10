import * as React from "react"
import { OTPInput, OTPInputContext } from "input-otp"

import { cn } from "../../lib/utils"
import { MinusIcon } from "lucide-react"

// Segmented OTP / verification-code input. Compound — assemble it yourself:
// <InputOTP maxLength={n} value onChange> (controlled, onChange returns the whole
// string) wraps <InputOTPGroup>, with one <InputOTPSlot index={i}/> per character
// (slot count must equal maxLength); put <InputOTPSeparator/> between groups.
// Presentation + per-slot entry only — no resend / countdown / auto-submit /
// validation. Restrict input via `pattern`; wire to react-hook-form with Controller.
function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  containerClassName?: string
}) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        "cn-input-otp flex items-center gap-2 has-disabled:opacity-50",
        containerClassName
      )}
      spellCheck={false}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  )
}

// 错误态的「单一所有者」：标了 aria-invalid 的 slot 是它的后代时，由这一层 :has()
// 统一画一圈红边框 + 红 ring（unified treatment）。slot 自己不再重复描边——否则
// group 一圈  + 命中的 slot 各自再一道，出现重复校验样式（与 Input prefix 那个坑同源）。
function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn(
        "flex items-center rounded-md has-aria-invalid:border-destructive has-aria-invalid:ring-2 has-aria-invalid:ring-destructive/20 dark:has-aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  index: number
}) {
  const inputOTPContext = React.useContext(OTPInputContext)
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {}

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(
        // 不在 slot 上画 aria-invalid 边框：错误态由 InputOTPGroup 的 :has() 统一兜（见上）。
        // 这里只保留 active（当前输入位）的 primary 高亮——错误组内仍能看清光标所在格。
        "relative flex size-10 h-12 items-center justify-center border border-line-default bg-surface-2 text-xl font-mono font-semibold rounded-md transition-all outline-none first:mr-0 data-[active=true]:z-10 data-[active=true]:border-primary data-[active=true]:ring-2 data-[active=true]:ring-primary/25",
        className
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>
  )
}

function InputOTPSeparator({ ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-separator"
      className="flex items-center [&_svg:not([class*='size-'])]:size-4"
      role="separator"
      {...props}
    >
      <MinusIcon
      />
    </div>
  )
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }


