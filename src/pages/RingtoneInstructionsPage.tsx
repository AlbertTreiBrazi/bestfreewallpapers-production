// ============================================================================
// 🎵 RingtoneInstructionsPage.tsx — /ringtones/how-to-set
// ============================================================================
// Pagina cu instrucțiuni complete pentru a seta ringtone:
//   - Tab Android (3-4 pași)
//   - Tab iPhone (5 pași cu GarageBand)
//   - FAQ comun
//   - Schema.org HowTo pentru SEO
// ============================================================================

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Smartphone, Apple, Music2, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { SEOHead } from '@/components/seo/SEOHead'

type Tab = 'android' | 'iphone'

export function RingtoneInstructionsPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [activeTab, setActiveTab] = useState<Tab>('android')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const seoConfig = {
    title: 'How to Set a Ringtone on Android & iPhone | BestFreeWallpapers',
    description:
      'Step-by-step guide to set a custom MP3 ringtone on your Android or iPhone. Learn how to download and install ringtones easily.',
    keywords: [
      'how to set ringtone',
      'ringtone tutorial',
      'iphone ringtone',
      'android ringtone',
      'mp3 ringtone setup',
      'garageband ringtone',
    ],
    image: '/images/og-ringtones.jpg',
  }

  // JSON-LD HowTo schema (added via meta tag in head)
  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to set an MP3 ringtone on your phone',
    description:
      'Step-by-step instructions to download and apply a custom MP3 ringtone on Android and iPhone.',
    totalTime: 'PT5M',
    supply: ['MP3 ringtone file', 'Smartphone (Android or iPhone)'],
    tool: ['Web browser', 'GarageBand app (iPhone only)'],
    step: [
      {
        '@type': 'HowToStep',
        name: 'Download the ringtone',
        text: 'Tap the Download MP3 button on the ringtone page.',
      },
      {
        '@type': 'HowToStep',
        name: 'Set as ringtone',
        text: 'On Android: open Settings → Sound → Ringtone → Add new. On iPhone: import via GarageBand app.',
      },
    ],
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-primary' : 'bg-gray-50'}`}>
      <SEOHead config={seoConfig} />

      {/* JSON-LD inline script for HowTo schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Back link */}
        <Link
          to="/ringtones"
          className={`inline-flex items-center gap-1.5 text-sm font-medium mb-6 transition-colors ${
            isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to ringtones
        </Link>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex p-3 rounded-2xl bg-blue-100 dark:bg-blue-900/30 mb-4">
            <Music2 className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className={`text-3xl sm:text-4xl font-bold mb-3 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            How to Set a Custom Ringtone
          </h1>
          <p className={`text-base sm:text-lg max-w-2xl mx-auto ${
            isDark ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Follow these step-by-step instructions to download and install your favorite
            ringtone on Android or iPhone.
          </p>
        </div>

        {/* Tabs */}
        <div className={`flex border-b mb-8 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
          <TabButton
            active={activeTab === 'android'}
            onClick={() => setActiveTab('android')}
            isDark={isDark}
            icon={<Smartphone className="w-5 h-5" />}
            label="Android"
          />
          <TabButton
            active={activeTab === 'iphone'}
            onClick={() => setActiveTab('iphone')}
            isDark={isDark}
            icon={<Apple className="w-5 h-5" />}
            label="iPhone"
          />
        </div>

        {/* Tab content */}
        <div className={`rounded-2xl p-6 sm:p-8 mb-10 ${
          isDark
            ? 'bg-gray-900 border border-gray-800'
            : 'bg-white border border-gray-200 shadow-md'
        }`}>
          {activeTab === 'android' ? (
            <AndroidInstructions isDark={isDark} />
          ) : (
            <IPhoneInstructions isDark={isDark} />
          )}
        </div>

        {/* FAQ */}
        <div>
          <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Frequently Asked Questions
          </h2>

          <div className="space-y-3">
            {FAQ_ITEMS.map((faq, idx) => (
              <FaqItem
                key={idx}
                question={faq.question}
                answer={faq.answer}
                isOpen={openFaq === idx}
                onToggle={() => setOpenFaq(openFaq === idx ? null : idx)}
                isDark={isDark}
              />
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className={`mt-12 p-8 rounded-2xl text-center ${
          isDark
            ? 'bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-800'
            : 'bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200'
        }`}>
          <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Ready to find your perfect ringtone?
          </h3>
          <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Browse our collection of free high-quality MP3 ringtones.
          </p>
          <Link
            to="/ringtones"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition shadow-lg"
          >
            <Music2 className="w-5 h-5" />
            Browse ringtones
          </Link>
        </div>
      </div>
    </div>
  )
}

// ===== Helper Components =====

function TabButton({
  active,
  onClick,
  isDark,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  isDark: boolean
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 font-medium border-b-2 transition ${
        active
          ? isDark
            ? 'border-blue-500 text-blue-400'
            : 'border-blue-600 text-blue-600'
          : isDark
            ? 'border-transparent text-gray-500 hover:text-gray-300'
            : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

function AndroidInstructions({ isDark }: { isDark: boolean }) {
  return (
    <div>
      <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Setting a ringtone on Android
      </h3>
      <p className={`mb-6 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        These steps work on most Android devices (Samsung, Google Pixel, OnePlus, Xiaomi, etc.).
        Menu names may vary slightly by manufacturer.
      </p>

      <div className="space-y-4">
        <Step
          number={1}
          title="Download the MP3 file"
          description="On the ringtone page, tap the blue Download MP3 button. The file will save to your phone's Downloads folder."
          isDark={isDark}
        />
        <Step
          number={2}
          title="Open Settings"
          description="Go to Settings → Sound & vibration (or just Sound, depending on your device)."
          isDark={isDark}
        />
        <Step
          number={3}
          title="Tap Ringtone"
          description="Find the Phone ringtone option (sometimes called Ringtone or Default ringtone)."
          isDark={isDark}
        />
        <Step
          number={4}
          title="Add your downloaded ringtone"
          description={`Tap "Add ringtone", "+", or the option to choose from device storage. Navigate to your Downloads folder, select the MP3 file you downloaded, and tap OK.`}
          isDark={isDark}
        />
        <Step
          number={5}
          title="You're done! 🎉"
          description="Your new ringtone is now set. Make a test call or wait for one to hear it!"
          isDark={isDark}
          isLast
        />
      </div>
    </div>
  )
}

function IPhoneInstructions({ isDark }: { isDark: boolean }) {
  return (
    <div>
      <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Setting a ringtone on iPhone
      </h3>
      <p className={`mb-6 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        Apple requires using the free GarageBand app to install custom ringtones (a quirk of iOS).
        It only takes 5 minutes.
      </p>

      <div className="space-y-4">
        <Step
          number={1}
          title="Download the MP3"
          description={`On the ringtone page, tap Download MP3. The file will save to the Files app on your iPhone (in the "On My iPhone" folder or "Downloads").`}
          isDark={isDark}
        />
        <Step
          number={2}
          title="Get GarageBand (free)"
          description={`If you don't have it, download GarageBand from the App Store — it's a free Apple app needed for this step.`}
          isDark={isDark}
        />
        <Step
          number={3}
          title="Create a new project"
          description={`Open GarageBand, tap the + button to create a new project, choose any instrument (Keyboard works fine), then tap the small "Tracks" button (looks like 4 horizontal lines) at the top left.`}
          isDark={isDark}
        />
        <Step
          number={4}
          title="Import your MP3"
          description={`Tap the loop icon (looks like a small circle) at the top right → Files tab → "Browse items from the Files app" → navigate to where your MP3 is saved → tap to add it.`}
          isDark={isDark}
        />
        <Step
          number={5}
          title="Drag the audio into your track"
          description="Drag the imported MP3 onto the timeline of your track. You can trim it if needed (max 30 seconds for ringtones)."
          isDark={isDark}
        />
        <Step
          number={6}
          title="Export as ringtone"
          description={`Tap the down-arrow at top left → "My Songs". Long-press your project → "Share" → "Ringtone". Give it a name and tap "Export". When done, tap "Use sound as..." → "Standard Ringtone". Done! 🎉`}
          isDark={isDark}
          isLast
        />
      </div>

      <div className={`mt-6 p-4 rounded-lg ${isDark ? 'bg-blue-900/30 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
        <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
          💡 <strong>Coming soon:</strong> We're working on adding M4R format downloads which will
          make this process much easier on iPhone. Stay tuned!
        </p>
      </div>
    </div>
  )
}

function Step({
  number,
  title,
  description,
  isDark,
  isLast,
}: {
  number: number
  title: string
  description: string
  isDark: boolean
  isLast?: boolean
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
          {number}
        </div>
        {!isLast && <div className={`w-0.5 flex-1 mt-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />}
      </div>
      <div className="flex-1 pb-4">
        <h4 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h4>
        <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          {description}
        </p>
      </div>
    </div>
  )
}

function FaqItem({
  question,
  answer,
  isOpen,
  onToggle,
  isDark,
}: {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
  isDark: boolean
}) {
  return (
    <div className={`rounded-lg border overflow-hidden ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-4 text-left font-medium transition ${
          isDark ? 'bg-gray-900 hover:bg-gray-800 text-white' : 'bg-white hover:bg-gray-50 text-gray-900'
        }`}
      >
        <span>{question}</span>
        {isOpen ? <ChevronUp className="w-5 h-5 shrink-0" /> : <ChevronDown className="w-5 h-5 shrink-0" />}
      </button>
      {isOpen && (
        <div className={`p-4 text-sm leading-relaxed ${isDark ? 'bg-gray-950 text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
          {answer}
        </div>
      )}
    </div>
  )
}

const FAQ_ITEMS = [
  {
    question: 'Why does iPhone require GarageBand for ringtones?',
    answer:
      "Apple's iOS doesn't allow direct ringtone installation from the browser. GarageBand is the official free app Apple provides for creating and installing custom ringtones — there's no other way around it without using a Mac.",
  },
  {
    question: 'Are these ringtones really free?',
    answer:
      'Yes! All non-premium ringtones are completely free to download and use. We support our service through ads. Premium ringtones offer ad-free downloads and exclusive content.',
  },
  {
    question: 'Why are ringtones limited to 30 seconds?',
    answer:
      "Both Android and iPhone limit custom ringtones to 30 seconds (Apple's limit is 30 seconds, Android's is technically longer but most users prefer short ringtones). All our ringtones are optimized for this length.",
  },
  {
    question: 'Can I use these for notifications and alarms too?',
    answer:
      'Absolutely! Any of our ringtones can be set as notification sounds, alarm tones, or message tones. The setup process is similar — just look for the Notification or Alarm sound option in your phone settings instead of Ringtone.',
  },
  {
    question: "I downloaded the file but can't find it. Where is it?",
    answer:
      "On Android, check your Downloads folder using the Files app. On iPhone, open the Files app and look in 'On My iPhone' or 'Downloads'. Some browsers may save to a different location — search for the filename.",
  },
  {
    question: 'Can I share these ringtones with friends?',
    answer:
      "You're welcome to share the ringtone page URL with friends! Please don't redistribute the audio files directly — direct them to our site so they can download it themselves.",
  },
]

export default RingtoneInstructionsPage
