import { Button, Card } from '@cloud/ui'

export function Golden() {
  return (
    <>
      <Button data-src={0} />
      <Card data-src={1} />
      <dl data-src={2} />
      {/* data-src={3} unimplemented:select */}
      {/* data-src={4} layout-residue:wizard-step */}
    </>
  )
}
