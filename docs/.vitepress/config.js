import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Backlink Pilot',
  description: 'Automated backlink submission for indie products',
  base: '/backlink-pilot/',

  head: [
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
  ],

  themeConfig: {
    logo: undefined,
    siteTitle: 'Backlink Pilot v2.1',

    nav: [
      { text: 'Guide', link: '/guide' },
      { text: 'Tutorial', link: '/tutorial' },
      { text: 'Troubleshooting', link: '/troubleshooting' },
      { text: 'GitHub', link: 'https://github.com/s87343472/backlink-pilot' },
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Home', link: '/' },
          { text: 'Usage Guide / 使用指南', link: '/guide' },
          { text: 'Tutorial / 上手教程', link: '/tutorial' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Site Adapters', link: '/adapters' },
          { text: 'Troubleshooting', link: '/troubleshooting' },
          { text: 'OpenClaw Skill', link: '/skill' },
        ],
      },
      {
        text: 'Contributing',
        items: [
          { text: 'Guidelines', link: '/contributing' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/s87343472/backlink-pilot' },
    ],

    footer: {
      message: 'MIT Licensed',
      copyright: 'Built with OpenClaw',
    },

    search: {
      provider: 'local',
    },
  },
})
