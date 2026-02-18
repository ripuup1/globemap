import type { Metadata } from 'next'
import InTheNewsClient from './InTheNewsClient'

export const metadata: Metadata = {
  title: 'As Seen In The News — Moms Across America',
  description:
    "Moms Across America has been featured on CNN, Fox News, Reuters, Joe Rogan, C-SPAN, and dozens more. Browse our complete media appearances.",
  openGraph: {
    title: 'As Seen In The News — Moms Across America',
    description:
      "Moms Across America has been featured on CNN, Fox News, Reuters, Joe Rogan, C-SPAN, and dozens more. Browse our complete media appearances.",
    type: 'website',
  },
}

export default function InTheNewsPage() {
  return <InTheNewsClient />
}
