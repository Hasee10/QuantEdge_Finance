import { type ComponentType, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  BookOpen,
  ChevronRight,
  CircleHelp,
  ExternalLink,
  LibraryBig,
  LifeBuoy,
  Mail,
  Search as SearchIcon,
  Settings2,
  Target,
  TrendingUp,
  Users,
  WalletCards,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type HelpArticle = {
  id: string
  title: string
  updatedAt: string
  summary: string
  steps: string[]
  highlights?: string[]
  ctaLabel?: string
  ctaRoute?: string
}

type HelpCategory = {
  id: string
  title: string
  icon: ComponentType<{ className?: string }>
  articles: HelpArticle[]
}

const helpCategories: HelpCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: BookOpen,
    articles: [
      {
        id: 'what-is-quantedge',
        title: 'What is QuantEdge?',
        updatedAt: 'March 19, 2026',
        summary:
          'QuantEdge is a finance intelligence workspace that combines live market intelligence, valuation tools, saved scenarios, and execution workflows in one operating system.',
        steps: [
          'Use the left navigation to jump between Market News, valuation models, your Firm Library, tasks, and workspace settings.',
          'Think of the dashboard as your command center: it surfaces activity, recent work, and the modules your team uses every day.',
          'As you save models and build a workspace, QuantEdge becomes the shared record for deals, watchlists, and operating priorities.',
        ],
        highlights: [
          'Best for analyst teams, independent operators, and finance-led firms.',
          'Your saved models and workspace context stay tied to your authenticated account.',
        ],
      },
      {
        id: 'create-account-sign-in',
        title: 'How to create your account and sign in',
        updatedAt: 'March 19, 2026',
        summary:
          'Use the sign-up and sign-in routes to create or access your workspace, then return to protected pages like dashboard, models, and settings.',
        steps: [
          'Open the sign-in screen from the landing page or any protected-route redirect.',
          'If you are new, switch to sign-up and enter your email, password, and name details.',
          'After authentication succeeds, QuantEdge sends you into the protected workspace instead of the public landing page.',
          'If you sign out, protected pages now send you back to sign in before you can continue.',
        ],
        ctaLabel: 'Open Sign In',
        ctaRoute: '/sign-in',
      },
      {
        id: 'set-up-firm-workspace',
        title: 'Setting up your firm workspace',
        updatedAt: 'March 19, 2026',
        summary:
          'Firm workspaces unlock shared branding, seats, teammate invitations, and organization-level visibility.',
        steps: [
          'Open the firm registration flow and enter your firm name, domain, your work email, and your title.',
          'QuantEdge creates an organization, assigns you as the owner, and links your profile to that workspace.',
          'Once the workspace is active, admin controls and invitation management become available.',
        ],
        ctaLabel: 'Create Workspace',
        ctaRoute: '/register',
      },
      {
        id: 'invite-team-members',
        title: 'Inviting team members to your workspace',
        updatedAt: 'March 19, 2026',
        summary:
          'Owners and admins can manage members, review pending invites, and keep the team directory current.',
        steps: [
          'Open Team Directory to review active members and pending invitations.',
          'Use Manage Members to jump into the admin member-management workflow.',
          'Invite new teammates with the correct role so they land in the right seat from day one.',
        ],
        ctaLabel: 'Open Team Directory',
        ctaRoute: '/users',
      },
      {
        id: 'understanding-dashboard',
        title: 'Understanding the dashboard',
        updatedAt: 'March 19, 2026',
        summary:
          'The dashboard is your high-level operating view for models, market intelligence, and execution activity.',
        steps: [
          'Use the dashboard to orient yourself at the start of the day and spot recent model work or team activity.',
          'Jump into deeper modules from the left sidebar once you know what needs attention.',
          'Return to the dashboard any time you want the broadest view of your workspace.',
        ],
        ctaLabel: 'Open Dashboard',
        ctaRoute: '/dashboard',
      },
    ],
  },
  {
    id: 'financial-models',
    title: 'Financial Models',
    icon: TrendingUp,
    articles: [
      {
        id: 'dcf-valuation',
        title: 'DCF Valuation',
        updatedAt: 'March 19, 2026',
        summary:
          'Use the DCF model to estimate intrinsic value from growth assumptions, discount rate, and terminal value inputs.',
        steps: [
          'Open DCF Valuation from the sidebar and enter revenue, growth rate, WACC, and terminal growth assumptions.',
          'Review the output sections for intrinsic value, valuation range, and the upside or downside versus the current market price.',
          'Adjust assumptions until the scenario matches your base, upside, or downside case.',
          'Save the model when you want it stored in the Firm Library for later comparison or team access.',
        ],
        highlights: [
          'WACC affects discounting sensitivity more than most users expect.',
          'Terminal growth should stay grounded in long-run economic reality.',
        ],
        ctaLabel: 'Try DCF Valuation',
        ctaRoute: '/dcf',
      },
      {
        id: 'lbo-quick-model',
        title: 'LBO Quick Model',
        updatedAt: 'March 19, 2026',
        summary:
          'The LBO Quick Model helps you test leverage structure, exit assumptions, and sponsor returns quickly.',
        steps: [
          'Open LBO Quick Model and enter acquisition price, debt and equity split, EBITDA, and exit multiple assumptions.',
          'Review the model output for IRR and cash-on-cash returns across the proposed hold period.',
          'Rename the scenario clearly so you can compare multiple leverage and exit cases later.',
          'Save the model to reuse it in your Firm Library.',
        ],
        ctaLabel: 'Try LBO Quick Model',
        ctaRoute: '/lbo-model',
      },
      {
        id: 'merger-analysis',
        title: 'Merger Analysis (Accretion / Dilution)',
        updatedAt: 'March 19, 2026',
        summary:
          'Use Merger Analysis to understand whether a transaction improves or dilutes the acquirer’s EPS.',
        steps: [
          'Open Merger Analysis and enter the acquirer and target financial inputs.',
          'Run the transaction assumptions to generate combined EPS and accretion or dilution outputs.',
          'Interpret EPS impact as the change in post-deal earnings per share versus the stand-alone acquirer.',
          'Use the output to discuss strategic fit, financing tradeoffs, and transaction viability.',
        ],
        ctaLabel: 'Try Merger Analysis',
        ctaRoute: '/merger-analysis',
      },
    ],
  },
  {
    id: 'market-intelligence',
    title: 'Market Intelligence',
    icon: CircleHelp,
    articles: [
      {
        id: 'market-news-feed',
        title: 'How the Market News feed works',
        updatedAt: 'March 19, 2026',
        summary:
          'The Market News feed brings together live finance coverage and presents it in multiple layouts for fast scanning.',
        steps: [
          'Open Market News from the sidebar to load the latest stream of market and deal content.',
          'Use category tabs like M&A Deals, Markets, Earnings, Geopolitics, Macro, PE & LBO, Fintech, and IPO to narrow the feed.',
          'Switch between Grid, List, and Magazine views depending on whether you want dense scanning or editorial-style reading.',
          'Bookmark the items you want to revisit later.',
        ],
        highlights: [
          'The feed is designed around finance workflows, not general-purpose news browsing.',
          'Layouts and filters work together, so you can isolate the exact slice you care about.',
        ],
        ctaLabel: 'Open Market News',
        ctaRoute: '/news',
      },
      {
        id: 'tickers-filter',
        title: 'Using the Tickers filter to track specific stocks',
        updatedAt: 'March 19, 2026',
        summary:
          'Ticker-focused filtering helps you reduce noise and stay close to the names your team is actually tracking.',
        steps: [
          'Use the ticker filter controls in Market News to focus coverage on your tracked names.',
          'Combine ticker filters with category tabs if you want only earnings, deals, or macro-adjacent stories for those companies.',
          'Bookmark or open relevant stories once you have the feed narrowed down.',
        ],
        ctaLabel: 'Filter the News Feed',
        ctaRoute: '/news',
      },
      {
        id: 'youtube-finance-videos',
        title: 'How YouTube Finance videos are sourced and displayed',
        updatedAt: 'March 19, 2026',
        summary:
          'The YouTube Finance section displays finance-related videos with thumbnails and routes you out to YouTube for playback.',
        steps: [
          'Scroll to the YouTube Finance section on Market News to browse the current video cards.',
          'Each card shows the title, publish timing, and a thumbnail derived from the associated YouTube video id.',
          'Click anywhere on the video card or play affordance to open the video in a new YouTube tab.',
        ],
        highlights: [
          'Video playback happens on YouTube, not inside an embedded QuantEdge player.',
          'If a thumbnail or video link is malformed, it usually points to missing source metadata rather than a backend outage.',
        ],
        ctaLabel: 'Open YouTube Finance',
        ctaRoute: '/news',
      },
    ],
  },
  {
    id: 'watchlist',
    title: 'Watchlist',
    icon: Target,
    articles: [
      {
        id: 'watchlist-basics',
        title: 'Adding, viewing, and removing watchlist tickers',
        updatedAt: 'March 19, 2026',
        summary:
          'The watchlist keeps a compact set of names in one place so you can monitor prices and quickly remove stale coverage targets.',
        steps: [
          'Use the add-ticker input to search for the symbol you want to track.',
          'Once it is added, review the cached market columns for each selected name.',
          'Use the remove action on the right side of the table when a ticker no longer belongs in your active coverage set.',
        ],
        ctaLabel: 'Open Watchlist',
        ctaRoute: '/watchlist',
      },
    ],
  },
  {
    id: 'firm-library',
    title: 'Firm Library',
    icon: LibraryBig,
    articles: [
      {
        id: 'firm-library-overview',
        title: 'Using the Firm Library',
        updatedAt: 'March 19, 2026',
        summary:
          'The Firm Library stores saved DCF, LBO, and merger-analysis scenarios so you can reopen or share them later.',
        steps: [
          'Save a model from DCF, LBO, or Merger Analysis when the scenario is worth keeping.',
          'Open Firm Library to review saved items, reopen them, and compare recent work.',
          'If your plan supports sharing, set the right visibility so teammates can access the scenario.',
        ],
        ctaLabel: 'Open Firm Library',
        ctaRoute: '/firm-library',
      },
    ],
  },
  {
    id: 'deal-tasks',
    title: 'Deal Tasks',
    icon: WalletCards,
    articles: [
      {
        id: 'deal-task-workflow',
        title: 'Creating and tracking deal tasks',
        updatedAt: 'March 19, 2026',
        summary:
          'Deal Tasks gives you a lightweight execution queue for model refreshes, deal follow-ups, and workspace actions.',
        steps: [
          'Open Deal Tasks and add a task title, priority, and optional related link.',
          'Use saved models, deals, or team actions as a source of manual or suggested tasks.',
          'Track status directly in the task list as work moves from open to in progress to done.',
        ],
        highlights: [
          'Suggested items help convert saved work into a visible execution queue.',
          'Manual tasks are stored locally per user and workspace context.',
        ],
        ctaLabel: 'Open Deal Tasks',
        ctaRoute: '/tasks',
      },
    ],
  },
  {
    id: 'workspace-team',
    title: 'Workspace & Team',
    icon: Users,
    articles: [
      {
        id: 'workspace-modes',
        title: 'Personal workspace vs Firm workspace',
        updatedAt: 'March 19, 2026',
        summary:
          'Personal workspaces are solo by default, while firm workspaces add shared members, invitations, and org-level controls.',
        steps: [
          'Stay in personal mode if you are working alone and only need your own saved models and tasks.',
          'Create a firm workspace when you need seat management, team visibility, invitations, and shared operating context.',
          'Review Team Directory to see the current roster and pending invitation posture.',
        ],
        ctaLabel: 'Open Team Directory',
        ctaRoute: '/users',
      },
      {
        id: 'workspace-admin',
        title: 'Managing workspace seats, visibility, and firm settings',
        updatedAt: 'March 19, 2026',
        summary:
          'Workspace controls live in the admin and profile flows, including plan posture, deal visibility, and firm domain setup.',
        steps: [
          'Open the workspace registration or admin tools to configure your firm name, domain, and organizational details.',
          'Use member-management workflows to understand seat usage and pending invites.',
          'When sharing library items or deals, choose the right visibility level for private or team-wide access.',
        ],
        ctaLabel: 'Open Firm Setup',
        ctaRoute: '/register',
      },
    ],
  },
  {
    id: 'account-settings',
    title: 'Account & Settings',
    icon: Settings2,
    articles: [
      {
        id: 'settings-overview',
        title: 'Updating your profile, notifications, display, and billing settings',
        updatedAt: 'March 19, 2026',
        summary:
          'The Settings area now contains working profile, account, appearance, notification, and display preferences.',
        steps: [
          'Open Settings and use the left rail to move between Profile, Account, Appearance, Notifications, and Display.',
          'Update your profile details and avatar from the Profile tab.',
          'Set notification and display preferences to match how you want QuantEdge to behave day to day.',
          'Use the Account area for personal details, language, and future billing-related entry points.',
        ],
        highlights: [
          'After sign-out, protected settings pages require you to sign in again before returning.',
          'Support-assisted email changes are linked directly from the profile page.',
        ],
        ctaLabel: 'Open Settings',
        ctaRoute: '/settings',
      },
      {
        id: 'password-and-billing',
        title: 'Changing your password and managing your plan',
        updatedAt: 'March 19, 2026',
        summary:
          'Authentication recovery lives in the auth flows, while plan and workspace setup are handled through the workspace and admin experiences.',
        steps: [
          'Use the sign-in flow if you need to recover or reset access credentials.',
          'Use workspace creation and management tools when you need to move from personal mode into a firm plan.',
          'Return to Settings to confirm your profile and notification preferences after any account changes.',
        ],
        ctaLabel: 'Open Settings',
        ctaRoute: '/settings',
      },
    ],
  },
]

export function HelpCenter() {
  const navigate = useNavigate()
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const [activeCategory, setActiveCategory] = useState(helpCategories[0].id)
  const [searchValue, setSearchValue] = useState('')
  const [supportQuestion, setSupportQuestion] = useState('')
  const [supportSubmitted, setSupportSubmitted] = useState(false)

  const filteredCategories = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    if (!query) return helpCategories

    return helpCategories
      .map((category) => ({
        ...category,
        articles: category.articles.filter((article) => {
          const searchableText = [
            article.title,
            article.summary,
            ...article.steps,
            ...(article.highlights ?? []),
          ]
            .join(' ')
            .toLowerCase()

          return searchableText.includes(query)
        }),
      }))
      .filter((category) => category.articles.length > 0)
  }, [searchValue])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries.find((entry) => entry.isIntersecting)
        if (!visibleEntry) return
        setActiveCategory(visibleEntry.target.id.replace('help-section-', ''))
      },
      {
        rootMargin: '-20% 0px -55% 0px',
        threshold: 0.1,
      }
    )

    const nodes = Object.values(sectionRefs.current).filter(Boolean)
    nodes.forEach((node) => {
      if (node) observer.observe(node)
    })

    return () => observer.disconnect()
  }, [filteredCategories])

  useEffect(() => {
    if (!filteredCategories.some((category) => category.id === activeCategory)) {
      setActiveCategory(filteredCategories[0]?.id ?? helpCategories[0].id)
    }
  }, [activeCategory, filteredCategories])

  function jumpToCategory(categoryId: string) {
    setActiveCategory(categoryId)
    sectionRefs.current[categoryId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  function openRoute(route?: string) {
    if (!route) return
    void navigate({ to: route as never })
  }

  function submitSupportQuestion() {
    if (!supportQuestion.trim()) {
      toast.error('Enter a support question before submitting.')
      return
    }

    setSupportSubmitted(true)
    setSupportQuestion('')
    toast.success("We'll get back to you within 24 hours.")
  }

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='min-h-[calc(100vh-4rem)] bg-[#0A0A0B] text-white' fluid>
        <div className='mx-auto flex w-full max-w-7xl flex-col gap-6 px-2 md:px-4'>
          <section className='rounded-3xl border border-white/7 bg-[#111113] p-6 md:p-8'>
            <div className='flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between'>
              <div className='space-y-3'>
                <p className='text-[11px] uppercase tracking-[0.18em] text-[#888]'>
                  Help Center
                </p>
                <h1 className='text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl'>
                  QuantEdge guides for the workflows you already use.
                </h1>
                <p className='max-w-3xl text-sm text-[#888] md:text-base'>
                  Search guides, jump between product areas, and open the live
                  feature directly from each article.
                </p>
              </div>
              <div className='grid gap-3 sm:grid-cols-3'>
                <StatCard label='Categories' value={String(helpCategories.length)} />
                <StatCard
                  label='Articles'
                  value={String(
                    helpCategories.reduce(
                      (total, category) => total + category.articles.length,
                      0
                    )
                  )}
                />
                <StatCard label='Support' value='24h' />
              </div>
            </div>

            <div className='mt-6 rounded-2xl border border-white/7 bg-[#18181C] p-3 md:p-4'>
              <div className='flex flex-col gap-3 md:flex-row md:items-center'>
                <div className='relative flex-1'>
                  <SearchIcon className='pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#888]' />
                  <Input
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder='Search articles, steps, features, and workflows'
                    className='h-12 border-white/7 bg-[#0A0A0B] pl-11 pr-12 text-white placeholder:text-[#888]'
                  />
                  {searchValue ? (
                    <button
                      type='button'
                      onClick={() => setSearchValue('')}
                      className='absolute right-3 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/7 bg-[#18181C] text-[#888] transition hover:text-white'
                    >
                      <X className='size-4' />
                    </button>
                  ) : null}
                </div>
                <div className='text-sm text-[#888]'>
                  {filteredCategories.reduce(
                    (total, category) => total + category.articles.length,
                    0
                  )}{' '}
                  matching article
                  {filteredCategories.reduce(
                    (total, category) => total + category.articles.length,
                    0
                  ) === 1
                    ? ''
                    : 's'}
                </div>
              </div>
            </div>
          </section>

          <div className='grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]'>
            <aside className='space-y-4 lg:sticky lg:top-24 lg:self-start'>
              <div className='rounded-2xl border border-white/7 bg-[#111113] p-4'>
                <p className='mb-3 text-[11px] uppercase tracking-[0.16em] text-[#888]'>
                  Categories
                </p>

                <div className='mb-4 lg:hidden'>
                  <select
                    value={activeCategory}
                    onChange={(event) => jumpToCategory(event.target.value)}
                    className='h-11 w-full rounded-xl border border-white/7 bg-[#18181C] px-3 text-sm text-white outline-none'
                  >
                    {filteredCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className='hidden space-y-2 lg:block'>
                  {filteredCategories.map((category) => {
                    const Icon = category.icon
                    const isActive = activeCategory === category.id
                    return (
                      <button
                        key={category.id}
                        type='button'
                        onClick={() => jumpToCategory(category.id)}
                        className={cn(
                          'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition',
                          isActive
                            ? 'border-[#E8540A]/40 bg-[#E8540A]/10 text-white'
                            : 'border-white/7 bg-[#18181C] text-[#888] hover:text-white'
                        )}
                      >
                        <span className='flex items-center gap-3'>
                          <Icon
                            className={cn(
                              'size-4',
                              isActive ? 'text-[#E8540A]' : 'text-[#888]'
                            )}
                          />
                          <span className='text-sm'>{category.title}</span>
                        </span>
                        <ChevronRight
                          className={cn(
                            'size-4',
                            isActive ? 'text-[#E8540A]' : 'text-[#888]'
                          )}
                        />
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className='rounded-2xl border border-white/7 bg-[#111113] p-4'>
                <p className='text-sm font-medium text-white'>Need direct support?</p>
                <p className='mt-2 text-sm text-[#888]'>
                  Reach the QuantEdge team at{' '}
                  <a
                    href='mailto:support@quantedge.app'
                    className='text-[#E8540A] underline underline-offset-4'
                  >
                    support@quantedge.app
                  </a>
                  .
                </p>
              </div>
            </aside>

            <div className='space-y-6'>
              {filteredCategories.length === 0 ? (
                <div className='rounded-2xl border border-white/7 bg-[#111113] p-8 text-center'>
                  <p className='text-lg font-medium text-white'>No results found</p>
                  <p className='mt-2 text-sm text-[#888]'>
                    Try a broader keyword like DCF, watchlist, settings, or
                    workspace.
                  </p>
                </div>
              ) : (
                filteredCategories.map((category) => (
                  <section
                    key={category.id}
                    id={`help-section-${category.id}`}
                    ref={(node) => {
                      sectionRefs.current[category.id] = node
                    }}
                    className='scroll-mt-24 space-y-4'
                  >
                    <div className='rounded-2xl border border-white/7 bg-[#111113] p-5'>
                      <div className='flex items-center gap-3'>
                        <category.icon className='size-5 text-[#E8540A]' />
                        <div>
                          <p className='text-[11px] uppercase tracking-[0.16em] text-[#888]'>
                            Category
                          </p>
                          <h2 className='text-2xl font-semibold text-white'>
                            {category.title}
                          </h2>
                        </div>
                      </div>
                    </div>

                    <div className='grid gap-4'>
                      {category.articles.map((article) => (
                        <article
                          key={article.id}
                          className='rounded-2xl border border-white/7 bg-[#111113] p-5 md:p-6'
                        >
                          <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                            <div>
                              <h3 className='text-2xl font-semibold tracking-[-0.02em] text-white'>
                                {article.title}
                              </h3>
                              <p className='mt-2 text-xs uppercase tracking-[0.16em] text-[#888]'>
                                Last updated {article.updatedAt}
                              </p>
                              <p className='mt-4 max-w-3xl text-sm leading-6 text-[#B0B0B2]'>
                                {article.summary}
                              </p>
                            </div>

                            {article.ctaRoute ? (
                              <Button
                                onClick={() => openRoute(article.ctaRoute)}
                                className='border-0 bg-[#E8540A] text-white hover:bg-[#F06A24]'
                              >
                                {article.ctaLabel ?? 'Try it now'}
                                <ExternalLink className='ml-2 size-4' />
                              </Button>
                            ) : null}
                          </div>

                          <div className='mt-6 rounded-2xl border border-white/7 bg-[#18181C] p-4 md:p-5'>
                            <p className='text-sm font-medium text-white'>
                              Step-by-step
                            </p>
                            <div className='mt-4 space-y-4'>
                              {article.steps.map((step, index) => (
                                <div key={step} className='flex gap-4'>
                                  <div className='flex size-8 shrink-0 items-center justify-center rounded-full border border-[#E8540A]/30 bg-[#E8540A]/10 text-sm font-semibold text-[#E8540A]'>
                                    {index + 1}
                                  </div>
                                  <p className='pt-1 text-sm leading-6 text-[#D9D9DB]'>
                                    {step}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {article.highlights?.length ? (
                            <div className='mt-4 rounded-2xl border border-white/7 bg-[#0A0A0B] p-4'>
                              <p className='text-sm font-medium text-white'>
                                Notes
                              </p>
                              <div className='mt-3 space-y-2'>
                                {article.highlights.map((highlight) => (
                                  <p
                                    key={highlight}
                                    className='text-sm leading-6 text-[#888]'
                                  >
                                    <span className='mr-2 text-[#E8540A]'>•</span>
                                    {highlight}
                                  </p>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </section>
                ))
              )}

              <section className='rounded-2xl border border-white/7 bg-[#111113] p-6 md:p-8'>
                <div className='flex items-start gap-3'>
                  <div className='rounded-2xl border border-[#E8540A]/20 bg-[#E8540A]/10 p-3'>
                    <LifeBuoy className='size-5 text-[#E8540A]' />
                  </div>
                  <div className='flex-1'>
                    <p className='text-[11px] uppercase tracking-[0.16em] text-[#888]'>
                      Support
                    </p>
                    <h2 className='mt-2 text-2xl font-semibold text-white'>
                      Still need help?
                    </h2>
                    <p className='mt-2 max-w-2xl text-sm leading-6 text-[#888]'>
                      Email the team directly or send a support question here and
                      we&apos;ll get back to you within 24 hours.
                    </p>
                    <a
                      href='mailto:support@quantedge.app'
                      className='mt-4 inline-flex items-center gap-2 text-sm text-[#E8540A] underline underline-offset-4'
                    >
                      <Mail className='size-4' />
                      support@quantedge.app
                    </a>

                    <div className='mt-6 flex flex-col gap-3 md:flex-row'>
                      <Input
                        value={supportQuestion}
                        onChange={(event) =>
                          setSupportQuestion(event.target.value)
                        }
                        placeholder='Ask a support question'
                        className='h-11 border-white/7 bg-[#18181C] text-white placeholder:text-[#888]'
                      />
                      <Button
                        onClick={submitSupportQuestion}
                        className='h-11 border-0 bg-[#E8540A] text-white hover:bg-[#F06A24]'
                      >
                        Submit Question
                      </Button>
                    </div>

                    {supportSubmitted ? (
                      <div className='mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200'>
                        We&apos;ll get back to you within 24 hours.
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </Main>
    </>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-2xl border border-white/7 bg-[#18181C] px-4 py-3'>
      <p className='text-[11px] uppercase tracking-[0.16em] text-[#888]'>
        {label}
      </p>
      <p className='mt-2 text-2xl font-semibold text-white'>{value}</p>
    </div>
  )
}
