/**
 * Topic Deep-Link Page
 *
 * Generates SEO metadata for shared topic links,
 * then renders the globe with the topic search active.
 */

import { Metadata } from 'next'
import TopicRedirect from './TopicRedirect'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const topicName = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return {
    title: `${topicName} - Vox Terra`,
    description: `Track ${topicName} events around the world on Vox Terra's interactive 3D globe.`,
    openGraph: {
      title: `${topicName} - Vox Terra`,
      description: `Track ${topicName} events around the world on Vox Terra's interactive 3D globe.`,
      type: 'article',
      siteName: 'Vox Terra',
    },
    twitter: {
      card: 'summary',
      title: `${topicName} - Vox Terra`,
      description: `Track ${topicName} events on Vox Terra.`,
    },
  }
}

export default async function TopicPage({ params }: Props) {
  const { slug } = await params
  return <TopicRedirect slug={slug} />
}
