'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import SiteNav from '@/components/UI/SiteNav'

// =============================================================================
// TYPES & CONFIG
// =============================================================================

type AppearanceType = 'tv' | 'podcast' | 'print' | 'documentary' | 'congressional'

interface Appearance {
  outlet: string
  title: string
  description?: string
  type: AppearanceType
  link: string
  year?: string
}

type FilterType = 'all' | 'tv' | 'podcast' | 'print' | 'documentary'

const BADGE_CONFIG: Record<AppearanceType, { label: string; color: string; bg: string }> = {
  tv: { label: 'TV & VIDEO', color: '#E74C3C', bg: 'rgba(231, 76, 60, 0.15)' },
  podcast: { label: 'PODCAST', color: '#8E44AD', bg: 'rgba(142, 68, 173, 0.15)' },
  print: { label: 'PRINT & ONLINE', color: '#2980B9', bg: 'rgba(41, 128, 185, 0.15)' },
  documentary: { label: 'DOCUMENTARY', color: '#B7950B', bg: 'rgba(183, 149, 11, 0.15)' },
  congressional: { label: 'CONGRESSIONAL', color: '#27AE60', bg: 'rgba(39, 174, 96, 0.15)' },
}

const FILTERS: { type: FilterType; label: string }[] = [
  { type: 'all', label: 'ALL' },
  { type: 'tv', label: 'TV & VIDEO' },
  { type: 'podcast', label: 'PODCASTS' },
  { type: 'print', label: 'PRINT & ONLINE' },
  { type: 'documentary', label: 'DOCUMENTARIES' },
]

const TRUST_OUTLETS = [
  'CNN', 'NBC', 'CBS', 'ABC', 'Fox News', 'C-SPAN',
  'Wall Street Journal', 'Reuters', 'Associated Press',
  'Dr. Oz Show', 'HuffPost', 'Vox', 'NPR', 'USA Today',
]

// =============================================================================
// FEATURED APPEARANCES
// =============================================================================

const FEATURED: Appearance[] = [
  {
    outlet: 'CNN',
    title: 'Zen Honeycutt on Making America Healthy Again',
    description:
      "Zen tells CNN's Meena Duerson why she feels hopeful about transforming America's food supply and what Moms Across America has accomplished.",
    type: 'tv',
    link: 'https://www.tiktok.com/@cnn/video/7449068365903236398',
    // TODO: Replace with direct CNN clip URL if available
    year: '2024',
  },
  {
    outlet: 'The Joe Rogan Experience',
    title: 'Moms Across America Mentioned on JRE',
    description:
      "Aaron Rodgers and Joe Rogan discuss phthalates, Dr. Shanna Swan's 'Countdown,' and Moms Across America in this 3-hour conversation reaching millions.",
    type: 'podcast',
    link: '#',
    // TODO: Add direct Spotify/YouTube link to JRE episode 1865
    year: '2023',
  },
  {
    outlet: "Children's Health Defense / The Defender",
    title: 'Alarming Levels of Pesticides Found in Top 20 Fast Food Chains',
    description:
      "Zen Honeycutt presents MAA's fast food testing results to Congressional aides, revealing glyphosate in 100% of top brands tested.",
    type: 'congressional',
    link: 'https://childrenshealthdefense.org/defender/kids-fast-food-pesticides-glyphosate-school-lunches/',
    year: '2023',
  },
]

// =============================================================================
// ALL APPEARANCES DATA
// =============================================================================

const APPEARANCES: Appearance[] = [
  // ── TV & VIDEO ──────────────────────────────────────────────────────────
  { outlet: 'CNN', title: 'Zen Honeycutt on MAHA movement', type: 'tv', link: 'https://www.tiktok.com/@cnn/video/7449068365903236398', year: '2024' },
  { outlet: 'CBS (KCAL9 Los Angeles)', title: 'Children\'s Health & Food Safety', type: 'tv', link: '#', year: '2020' },
  // TODO: Find CBS KCAL9 segment link
  { outlet: 'C-SPAN', title: 'Congressional testimony on food safety', type: 'tv', link: '#' },
  // TODO: Find C-SPAN archive link
  { outlet: 'Fox News', title: 'Girl Scout Cookie testing coverage', type: 'tv', link: '#', year: '2025' },
  // TODO: Find Fox News segment link
  { outlet: 'ABC', title: 'Zen Honeycutt interview on GMOs', type: 'tv', link: '#' },
  // TODO: Find ABC segment link
  { outlet: 'NBC', title: 'Food safety segment', type: 'tv', link: '#' },
  // TODO: Find NBC segment link
  { outlet: 'Dr. Oz Show', title: 'Zen Honeycutt on glyphosate', type: 'tv', link: '#' },
  // Note: Original clip no longer available per MAA site
  { outlet: 'CHD TV — The Empower Hour', title: 'Weekly show hosted by Zen Honeycutt', type: 'tv', link: 'https://live.childrenshealthdefense.org/', year: '2021–Present' },
  { outlet: 'The Highwire with Del Bigtree', title: "RFK Jr.'s HHS impact on health", type: 'tv', link: 'https://www.deezer.com/us/episode/720841851', year: '2025' },
  { outlet: 'The Highwire with Del Bigtree', title: '"New Gold Standard" glyphosate testing', type: 'tv', link: '#' },
  // TODO: Add direct link
  { outlet: 'The Highwire with Del Bigtree', title: '"Glyphosate in Pregnancy Causes Autism Behaviors"', type: 'tv', link: '#' },
  // TODO: Add direct link

  // ── PODCASTS & RADIO ────────────────────────────────────────────────────
  { outlet: 'Joe Rogan Experience (Ep. 1865)', title: 'MAA mentioned — Aaron Rodgers interview', type: 'podcast', link: '#', year: '2023' },
  // TODO: JRE ep 1865 link
  { outlet: 'The People\'s Truth with Tia Severino', title: '"Mothers on Mission" with Zen Honeycutt', type: 'podcast', link: '#' },
  // TODO: Add link
  { outlet: 'Homegrown Podcast', title: 'Glyphosate, GMOs, and Motherhood', type: 'podcast', link: 'https://www.buzzsprout.com/1944256/11466409', year: '2022' },
  { outlet: 'Homegrown Podcast (Ep. 2)', title: 'School Lunches: Glyphosate, Heavy Metals, Vet Drugs', type: 'podcast', link: 'https://www.buzzsprout.com/1944256/11466409', year: '2022' },
  { outlet: 'Tim James Unleashed', title: 'Moms Across America Fight For Our Food', type: 'podcast', link: 'https://podcasts.apple.com/gt/podcast/zen-honeycutt-moms-across-america-fight-for-our-food/id1500992074?i=1000663621574', year: '2024' },
  { outlet: 'Wellness Force Radio (Ep. 237)', title: '"Real Changes at the Dinner Table" with Zen', type: 'podcast', link: '#' },
  // TODO: Add Wellness Force link
  { outlet: 'Primal Pioneer', title: 'GMOs and Their Potential Health Risks', type: 'podcast', link: '#' },
  // TODO: Add link
  { outlet: 'Bryan McClain Show', title: 'Zen Honeycutt interview', type: 'podcast', link: '#', year: '2022' },
  // TODO: Add link
  { outlet: 'Deprogram with Michael Parker', title: 'Zen Honeycutt & Adam Leow', type: 'podcast', link: '#' },
  // TODO: Add link
  { outlet: 'Secrets of Success with Dr. Ken Keis', title: 'Transform Your Health and Wellness', type: 'podcast', link: '#' },
  // TODO: Add link
  { outlet: 'Intelligent Medicine with Dr. Ronald Hoffman', title: 'The World Food Supply and Your Health', type: 'podcast', link: '#', year: '2019' },
  // TODO: Add link
  { outlet: 'School of Holistic Living', title: 'The Truth About Glyphosate and GMOs', type: 'podcast', link: '#', year: '2019' },
  // TODO: Add link
  { outlet: 'Healing Quest', title: 'Interview with Zen Honeycutt', type: 'podcast', link: '#', year: '2019' },
  // TODO: Add link
  { outlet: 'One Radio Network', title: 'Interview with Zen Honeycutt', type: 'podcast', link: '#', year: '2019' },
  // TODO: Add link
  { outlet: 'The Lisa Wexler Show', title: 'Interview with Zen Honeycutt', type: 'podcast', link: '#', year: '2019' },
  // TODO: Add link
  { outlet: 'Outliers Podcast', title: 'Interview with Zen Honeycutt', type: 'podcast', link: '#', year: '2019' },
  // TODO: Add link
  { outlet: 'Sky Dragon Slaying Podcast', title: '2-hour deep dive with Zen', type: 'podcast', link: '#' },
  // TODO: Add link
  { outlet: 'Alternative Talk 1150 KKNW', title: 'Moms Across America interview', type: 'podcast', link: 'https://1150kknw.com/moms-across-america', year: '2024' },
  { outlet: 'Responsible Eating and Living (REAL)', title: 'Zen Honeycutt interview', type: 'podcast', link: 'https://responsibleeatingandliving.com/zen-honeycutt-and-colleen-patrick-goudreau/', year: '2019' },

  // ── PRINT & ONLINE ──────────────────────────────────────────────────────
  { outlet: 'Reuters', title: 'Angry Mothers Meet U.S. EPA Over Concerns with Roundup', type: 'print', link: 'https://www.reuters.com/article/us-monsanto-roundup-epa/angry-mothers-meet-u-s-epa-over-concerns-with-roundup-herbicide-idUSKBN0E72IH20140527', year: '2014' },
  { outlet: 'Vox', title: "Meatless Meat Is Becoming Mainstream — And It's Sparking a Backlash", type: 'print', link: '#', year: '2019' },
  // TODO: Find Vox article link
  { outlet: 'HuffPost', title: 'Moms Across America Call For...', type: 'print', link: 'https://www.huffingtonpost.com/shannon-watts/moms-across-america-call-_b_5692165.html', year: '2014' },
  { outlet: 'USA Today', title: 'Veterans standing with communities', type: 'print', link: 'https://www.usatoday.com/story/news/nation-now/2016/12/03/hundreds-veterans-put-our-bodies-line-pipeline-protest/94910244/', year: '2016' },
  { outlet: 'Whole Foods Magazine', title: 'Move Over GMOs…Hello, Regenerative Organic Ag!', type: 'print', link: '#', year: '2020' },
  // TODO: Add Whole Foods Mag link
  { outlet: 'Whole Foods Magazine', title: 'Good-Health Reads: Zen Honeycutt', type: 'print', link: '#', year: '2020' },
  // TODO: Add Whole Foods Mag link
  { outlet: 'NPR', title: 'Feature on Zen Honeycutt and food supply concerns', type: 'print', link: '#' },
  // TODO: Find NPR segment link
  { outlet: "Children's Health Defense — The Defender", title: 'Testing Reveals High Levels of Toxic Pesticides in Fast Foods', type: 'print', link: 'https://childrenshealthdefense.org/defender/kids-fast-food-pesticides-glyphosate-school-lunches/', year: '2023' },
  { outlet: "Children's Health Defense — The Defender", title: 'School Lunch Testing Results', type: 'print', link: '#', year: '2022' },
  // TODO: Add CHD school lunch article
  { outlet: 'Market Herald', title: 'National School Lunch Testing Revealed', type: 'print', link: '#' },
  // TODO: Add Market Herald link
  { outlet: 'WAVY News', title: 'National School Lunch Testing Shows Unsafe, Toxic, Low in Nutrients', type: 'print', link: '#' },
  // TODO: Add WAVY link
  { outlet: 'WSPA News', title: 'National School Lunch Testing Shows Unsafe, Toxic, Low in Nutrients', type: 'print', link: '#' },
  // TODO: Add WSPA link
  { outlet: 'New Hope Network', title: 'Ingredient Substitution Rule Dangerous for Public', type: 'print', link: '#' },
  // TODO: Add link
  { outlet: 'Natural News', title: 'MAA Releases Powerful New Documentary', type: 'print', link: '#' },
  // TODO: Add link
  { outlet: 'Greenville Online', title: 'Group Criticizes Mass Death of Bees After Zika Spray', type: 'print', link: 'https://www.greenvilleonline.com/story/news/2016/09/02/group-criticizes-mass-death-bees-zika-spray/89780020/', year: '2016' },
  { outlet: 'Politico Morning Agriculture', title: 'Soda tax and food policy coverage', type: 'print', link: 'https://www.politico.com/tipsheets/morning-agriculture/2016/08/soda-tax-battles-open-up-out-west-216099', year: '2016' },
  { outlet: 'MAHA Institute / Globe Newswire', title: 'MAHA Institute launch featuring Zen Honeycutt', type: 'print', link: 'https://www.globenewswire.com/news-release/2025/05/22/3086911/0/en/MAHA-Institute-Launches-to-Support-Trump-Kennedy-Health-Agenda-and-Commission-Report.html', year: '2025' },
  { outlet: 'Court Ruling Coverage', title: "General Mills / Nature Valley 'Natural' label case", type: 'print', link: '#' },
  // TODO: Add court ruling article link

  // ── DOCUMENTARIES ───────────────────────────────────────────────────────
  { outlet: 'Communities Rising', title: "Zen Honeycutt's short film highlighting communities transforming their local food supply", type: 'documentary', link: '#' },
  // TODO: Add streaming link
  { outlet: 'Common Ground', title: 'Sequel to Kiss the Ground, narrated by Jason Momoa & Laura Dern, featuring Zen Honeycutt', type: 'documentary', link: '#', year: '2023' },
  // TODO: Add streaming link
  { outlet: 'Secret Ingredients', title: 'Families share recovery journeys after eliminating GMOs and pesticides', type: 'documentary', link: '#', year: '2018' },
  // TODO: Add streaming link
  { outlet: 'BOUGHT', title: 'Exposing the hidden story behind vaccines, big pharma, and your food', type: 'documentary', link: '#', year: '2014' },
  // TODO: Add streaming link
  { outlet: 'Genetic Roulette', title: "Jeffrey Smith's landmark documentary on GMOs and health", type: 'documentary', link: '#', year: '2012' },
  // TODO: Add streaming link
  { outlet: 'Poisoned', title: 'Documentary about the food safety crisis', type: 'documentary', link: '#' },
  // TODO: Add streaming link
]

// =============================================================================
// HELPER: check if link is a placeholder
// =============================================================================

function isPlaceholder(link: string): boolean {
  return link === '#'
}

// =============================================================================
// HELPER: match filter to appearance type
// Congressional shows under 'all' and 'tv' filters
// =============================================================================

function matchesFilter(type: AppearanceType, filter: FilterType): boolean {
  if (filter === 'all') return true
  if (filter === 'tv') return type === 'tv' || type === 'congressional'
  return type === filter
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function InTheNewsClient() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  // Override mobile body fixed positioning so this page can scroll
  useEffect(() => {
    const prev = {
      position: document.body.style.position,
      overflow: document.body.style.overflow,
      height: document.body.style.height,
      width: document.body.style.width,
    }
    document.body.style.position = 'static'
    document.body.style.overflow = 'auto'
    document.body.style.height = 'auto'
    document.body.style.width = '100%'
    return () => {
      document.body.style.position = prev.position
      document.body.style.overflow = prev.overflow
      document.body.style.height = prev.height
      document.body.style.width = prev.width
    }
  }, [])

  const filtered = APPEARANCES.filter((a) => matchesFilter(a.type, activeFilter))

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'linear-gradient(180deg, #060a14 0%, #0a1020 40%, #0d1426 100%)',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      }}
    >
      <SiteNav />

      {/* ================================================================
          SECTION 1 — HERO
          ================================================================ */}
      <section className="pt-28 pb-16 px-4 text-center max-w-4xl mx-auto">
        {/* Subtle top glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
          }}
        />
        <h1
          className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6"
          style={{ fontFamily: 'var(--font-exo2), system-ui, sans-serif' }}
        >
          As Seen In The{' '}
          <span
            className="text-transparent bg-clip-text"
            style={{
              backgroundImage: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 50%, #c084fc 100%)',
            }}
          >
            News
          </span>
        </h1>
        <p className="text-gray-400 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
          From CNN and Reuters to Joe Rogan and Capitol Hill — Moms Across America&apos;s mission
          has reached hundreds of millions of people worldwide. Here&apos;s where you&apos;ve seen us.
        </p>
      </section>

      {/* ================================================================
          SECTION 2 — MEDIA TRUST STRIP
          ================================================================ */}
      <section
        className="py-6 border-y"
        style={{ borderColor: 'rgba(255, 255, 255, 0.04)' }}
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-6 sm:gap-8 overflow-x-auto scrollbar-hide py-2">
            {TRUST_OUTLETS.map((outlet) => (
              <span
                key={outlet}
                className="text-xs sm:text-sm font-medium tracking-wider uppercase whitespace-nowrap flex-shrink-0"
                style={{ color: 'rgba(255, 255, 255, 0.25)' }}
              >
                {outlet}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          SECTION 3 — FEATURED / HIGHLIGHT APPEARANCES
          ================================================================ */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2
            className="text-xs font-semibold tracking-[0.2em] uppercase mb-8 text-center"
            style={{ color: '#818cf8' }}
          >
            Featured Appearances
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURED.map((item, i) => {
              const badge = BADGE_CONFIG[item.type]
              const placeholder = isPlaceholder(item.link)
              return (
                <article
                  key={i}
                  className="rounded-2xl p-6 transition-all duration-200 hover:scale-[1.01]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                      style={{
                        color: badge.color,
                        background: badge.bg,
                        border: `1px solid ${badge.color}30`,
                      }}
                    >
                      {badge.label}
                    </span>
                    {item.year && (
                      <span className="text-xs text-gray-500">{item.year}</span>
                    )}
                  </div>
                  <h3
                    className="text-white font-semibold text-base mb-1"
                    style={{ fontFamily: 'var(--font-exo2), system-ui, sans-serif' }}
                  >
                    {item.outlet}
                  </h3>
                  <p className="text-gray-300 text-sm mb-3">{item.title}</p>
                  {item.description && (
                    <p className="text-gray-500 text-sm mb-4 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                  {placeholder ? (
                    <span className="text-xs text-gray-600 italic">Coming Soon</span>
                  ) : (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium transition-colors hover:opacity-80"
                      style={{ color: '#818cf8' }}
                    >
                      Watch / Read
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <span className="sr-only">(opens in new tab)</span>
                    </a>
                  )}
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* ================================================================
          SECTION 4 — FILTER BAR + FULL APPEARANCES LIST
          ================================================================ */}
      <section className="pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2
            className="text-xs font-semibold tracking-[0.2em] uppercase mb-8 text-center"
            style={{ color: '#818cf8' }}
          >
            All Appearances
          </h2>

          {/* Filter bar */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-6 mb-2 justify-center">
            {FILTERS.map((f) => (
              <button
                key={f.type}
                onClick={() => setActiveFilter(f.type)}
                className="flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all duration-200"
                style={
                  activeFilter === f.type
                    ? {
                        background: 'rgba(99, 102, 241, 0.2)',
                        border: '1px solid rgba(99, 102, 241, 0.4)',
                        color: '#a5b4fc',
                        boxShadow: '0 0 12px rgba(99, 102, 241, 0.15)',
                      }
                    : {
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        color: '#6b7280',
                      }
                }
                aria-label={`Filter by ${f.label}`}
                aria-pressed={activeFilter === f.type}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Results count */}
          <p className="text-center text-xs text-gray-600 mb-8">
            Showing {filtered.length} appearance{filtered.length !== 1 ? 's' : ''}
          </p>

          {/* Cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item, i) => {
              const badge = BADGE_CONFIG[item.type]
              const placeholder = isPlaceholder(item.link)
              return (
                <article
                  key={`${item.outlet}-${item.title}-${i}`}
                  className="news-appearance-card rounded-xl p-5 transition-all duration-200 hover:scale-[1.01]"
                  data-type={item.type}
                  style={{
                    background: placeholder
                      ? 'rgba(255, 255, 255, 0.015)'
                      : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${placeholder ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.06)'}`,
                    opacity: placeholder ? 0.7 : 1,
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                      style={{
                        color: badge.color,
                        background: badge.bg,
                        border: `1px solid ${badge.color}30`,
                      }}
                    >
                      {badge.label}
                    </span>
                    {item.year && (
                      <span className="text-xs text-gray-500">{item.year}</span>
                    )}
                  </div>
                  <h3
                    className="text-white font-semibold text-sm mb-1"
                    style={{ fontFamily: 'var(--font-exo2), system-ui, sans-serif' }}
                  >
                    {item.outlet}
                  </h3>
                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">{item.title}</p>
                  {placeholder ? (
                    <span className="text-xs text-gray-600 italic">Coming Soon</span>
                  ) : (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
                      style={{ color: '#818cf8' }}
                    >
                      Watch / Read
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <span className="sr-only">(opens in new tab)</span>
                    </a>
                  )}
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* ================================================================
          SECTION 5 — CTA BANNER
          ================================================================ */}
      <section
        className="py-16 px-4 border-t"
        style={{ borderColor: 'rgba(255, 255, 255, 0.04)' }}
      >
        <div className="max-w-2xl mx-auto text-center">
          <h2
            className="text-2xl sm:text-3xl font-bold text-white mb-4"
            style={{ fontFamily: 'var(--font-exo2), system-ui, sans-serif' }}
          >
            Want to Feature Moms Across America?
          </h2>
          <p className="text-gray-400 text-base mb-8 leading-relaxed">
            We&apos;re available for interviews, panel discussions, and expert commentary on food
            safety, pesticide contamination, and children&apos;s health.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/media#press-contact"
              className="px-6 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                color: '#c7d2fe',
                boxShadow: '0 0 20px rgba(99, 102, 241, 0.15)',
              }}
            >
              Contact Our Press Team
            </Link>
            <Link
              href="/media"
              className="px-6 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#9ca3af',
              }}
            >
              Download Press Kit
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-6 px-4 text-center border-t"
        style={{ borderColor: 'rgba(255, 255, 255, 0.03)' }}
      >
        <p className="text-xs text-gray-600">
          &copy; {new Date().getFullYear()} Moms Across America. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
