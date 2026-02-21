/**
 * Event Deep-Link Page
 *
 * Generates SEO metadata for shared event links,
 * then renders the globe with the event pre-selected.
 */

import { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase'
import EventRedirect from './EventRedirect'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = createServerClient()

  if (!supabase) {
    return { title: 'Event - Vox Terra' }
  }

  const { data } = await (supabase as any)
    .from('events')
    .select('title, description, category, country, location_name')
    .eq('id', id)
    .single()

  if (!data) {
    return { title: 'Event Not Found - Vox Terra' }
  }

  const row = data as any
  const title = `${row.title} - Vox Terra`
  const description = row.description || `${row.category} event in ${row.location_name || row.country || 'the world'}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      siteName: 'Vox Terra',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export default async function EventPage({ params }: Props) {
  const { id } = await params
  return <EventRedirect eventId={id} />
}
