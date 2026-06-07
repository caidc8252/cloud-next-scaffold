import * as React from 'react'
import { cn } from '../../lib/utils'

const PAGE_BODY_CLASS_NAME = 'flex flex-col gap-6 px-6 pt-6 pb-8'
const PAGE_BODY_PADDING_CLASS_NAME = 'px-6 pt-6 pb-8'

type PageBodyProps = React.HTMLAttributes<HTMLDivElement>

function PageBody({ className, ...props }: PageBodyProps) {
  return <div className={cn(PAGE_BODY_CLASS_NAME, className)} {...props} />
}

export { PageBody, PAGE_BODY_CLASS_NAME, PAGE_BODY_PADDING_CLASS_NAME }
