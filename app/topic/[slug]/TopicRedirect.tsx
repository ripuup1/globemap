/**
 * Client-side redirect to main page with topic query param.
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TopicRedirect({ slug }: { slug: string }) {
  const router = useRouter()

  useEffect(() => {
    router.replace(`/?topic=${encodeURIComponent(slug)}`)
  }, [slug, router])

  return (
    <div className="flex items-center justify-center h-screen bg-black">
      <div className="text-center">
        <div
          className="w-10 h-10 mx-auto rounded-full border-2 border-gray-700 border-t-blue-500 mb-4"
          style={{ animation: 'spin 1s linear infinite' }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p className="text-gray-400 text-sm">Loading topic...</p>
      </div>
    </div>
  )
}
