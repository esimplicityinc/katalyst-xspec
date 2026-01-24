import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "Katalyst",
  tagline:
    "Domain-Driven Design meets BDD testing with AI Agent Swarms",
  favicon: "img/favicon.ico",

  // Set the production url of your site here
  url: "https://esimplicityinc.github.io",
  // Set the /<baseUrl>/ pathname under which your site is served
  baseUrl: "/katalyst-bdd-test/",

  // GitHub pages deployment config
  organizationName: "esimplicityinc",
  projectName: "katalyst-bdd-test",

  onBrokenLinks: "warn",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  // Enable Mermaid support and use standard markdown format
  // (MDX would interpret {string} as JSX expressions)
  markdown: {
    format: "md",
    mermaid: true,
  },
  themes: ["@docusaurus/theme-mermaid"],

  presets: [
    [
      "classic",
      {
        docs: {
          path: "../docs",
          routeBasePath: "docs",
          sidebarPath: "./sidebars.ts",
          editUrl:
            "https://github.com/esimplicityinc/katalyst-bdd-test/tree/main/website/",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Mermaid theme configuration
    mermaid: {
      theme: { light: "neutral", dark: "dark" },
    },
    navbar: {
      title: "Katalyst",
      logo: {
        alt: "Katalyst Logo",
        src: "img/logo.png",
        href: "/docs/",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "docsSidebar",
          position: "left",
          label: "Documentation",
        },
        {
          href: "https://github.com/esimplicityinc/katalyst-bdd-test/tree/main/examples",
          label: "Examples",
          position: "left",
        },
        {
          href: "https://github.com/esimplicityinc/katalyst-bdd-test",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            {
              label: "Getting Started",
              to: "/docs/getting-started/installation",
            },
            {
              label: "Guides",
              to: "/docs/guides/api-testing",
            },
            {
              label: "Reference",
              to: "/docs/reference/api/ports",
            },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/esimplicityinc/katalyst-bdd-test",
            },
            {
              label: "npm",
              href: "https://www.npmjs.com/package/@esimplicity/stack-tests",
            },
          ],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} eSimplicity Inc. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["gherkin", "bash", "json", "typescript"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
