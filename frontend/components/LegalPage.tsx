import { APP_NAME } from '@/lib/appConfig'
import { ReactNode } from 'react'

// Shared shell for the static legal pages (server component, no client JS needed)
export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="min-h-screen px-4 py-10">
      <article className="glass-strong mx-auto max-w-3xl rounded-2xl p-6 md:p-10 text-gray-200 leading-relaxed space-y-5 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:pt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_a]:text-blue-300 [&_a]:underline">
        <a href="/" className="text-sm">&larr; Back to {APP_NAME}</a>
        <h1 className="text-3xl font-bold text-white">{title}</h1>
        <p className="text-sm text-gray-400">Last updated: {updated}</p>
        {children}
      </article>
    </main>
  )
}
