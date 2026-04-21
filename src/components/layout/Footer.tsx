import React from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '@/contexts/ThemeContext'
import { Facebook, Instagram, Twitter, Mail } from 'lucide-react'

export function Footer() {
  const { theme } = useTheme()
  const currentYear = new Date().getFullYear()

  const mainPages = [
    { name: 'Home', href: '/' },
    { name: 'Search', href: '/search' },
    { name: 'Free Wallpapers', href: '/free-wallpapers' },
    { name: 'AI Wallpapers', href: '/ai-wallpapers' },
    { name: 'Mobile Wallpapers', href: '/mobile-wallpapers' },
    { name: 'Premium Wallpapers', href: '/premium' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ]

  const categories = [
    { name: 'Nature', href: '/category/nature' },
    { name: 'Abstract', href: '/category/abstract' },
    { name: 'Gaming', href: '/category/gaming' },
    { name: 'Space', href: '/category/space' },
    { name: 'Technology', href: '/category/technology' },
    { name: 'Movies', href: '/category/movies' },
  ]

  const resources = [
    { name: 'Help Center', href: '/help' },
    { name: 'Upload Guidelines', href: '/guidelines' },
    { name: 'API Access', href: '/api' },
    { name: 'Mobile App', href: '/mobile' },
    { name: 'Wallpaper Sizes', href: '/sizes' },
  ]

  const legal = [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms & Conditions', href: '/terms' },
    { name: 'Cookie Policy', href: '/cookie-policy' },
    { name: 'DMCA', href: '/dmca' },
    { name: 'License Info', href: '/license' },
  ]

  const LinkList = ({ links }: { links: { name: string; href: string }[] }) => (
    <ul className="space-y-2">
      {links.map((link) => (
        <li key={link.name}>
          <Link
            to={link.href}
            className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
          >
            {link.name}
          </Link>
        </li>
      ))}
    </ul>
  )

  return (
    <footer className={`${theme === 'dark' ? 'bg-dark-primary' : 'bg-gray-900'} text-white transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Main grid: brand col + 4 link columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-6">

          {/* Brand column — spans 1 col but visually wider */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-lg leading-none">B</span>
              </div>
              <span className="text-lg font-bold whitespace-nowrap">BestFreeWallpapers</span>
            </div>

            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Discover 10,000+ stunning HD, 4K &amp; 8K wallpapers across all categories.
              Updated daily with new designs for desktop and mobile.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-xl font-bold text-white">10K+</div>
                <div className="text-xs text-gray-500">Wallpapers</div>
              </div>
              <div>
                <div className="text-xl font-bold text-white">50+</div>
                <div className="text-xs text-gray-500">Categories</div>
              </div>
              <div>
                <div className="text-xl font-bold text-white">1M+</div>
                <div className="text-xs text-gray-500">Downloads</div>
              </div>
            </div>
          </div>

          {/* Main Pages */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Main Pages</h3>
            <LinkList links={mainPages} />
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Categories</h3>
            <LinkList links={categories} />
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Resources</h3>
            <LinkList links={resources} />
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Legal</h3>
            <LinkList links={legal} />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 mt-10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            © {currentYear} BestFreeWallpapers. All rights reserved.
          </p>

          {/* Social icons */}
          <div className="flex items-center space-x-5">
            <a
              href="https://facebook.com/bestfreewallpapers"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-white transition-colors duration-200"
              aria-label="Follow us on Facebook"
            >
              <Facebook className="w-5 h-5" />
            </a>
            <a
              href="https://instagram.com/bestfreewallpapers"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-white transition-colors duration-200"
              aria-label="Follow us on Instagram"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a
              href="https://twitter.com/bestfreewallpapers"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-white transition-colors duration-200"
              aria-label="Follow us on Twitter"
            >
              <Twitter className="w-5 h-5" />
            </a>
            <a
              href="mailto:contact@bestfreewallpapers.com"
              className="text-gray-500 hover:text-white transition-colors duration-200"
              aria-label="Contact us via email"
            >
              <Mail className="w-5 h-5" />
            </a>
          </div>
        </div>

      </div>
    </footer>
  )
}
