import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: "doc",
      id: "README",
      label: "Introduction",
    },
    {
      type: "doc",
      id: "executive-summary",
      label: "Executive Summary",
    },
    {
      type: "category",
      label: "Getting Started",
      collapsed: false,
      items: [
        "getting-started/installation",
        "getting-started/quick-start",
        "getting-started/project-setup",
      ],
    },
    {
      type: "doc",
      id: "troubleshooting",
      label: "Troubleshooting",
    },
    {
      type: "category",
      label: "Core Concepts",
      items: [
        "concepts/architecture",
        "concepts/world-state",
        "concepts/test-lifecycle",
        "concepts/tag-system",
      ],
    },
    {
      type: "category",
      label: "Guides",
      items: [
        "guides/api-testing",
        "guides/ui-testing",
        "guides/tui-testing",
        "guides/hybrid-testing",
        "guides/custom-adapters",
        "guides/custom-steps",
        "guides/ci-cd",
        "guides/agent-skills",
      ],
    },
    {
      type: "category",
      label: "Reference",
      items: [
        {
          type: "category",
          label: "API Reference",
          items: [
            "reference/api/ports",
            "reference/api/adapters",
            "reference/api/fixtures",
            "reference/api/utilities",
            "reference/api/configuration",
          ],
        },
        {
          type: "category",
          label: "Step Reference",
          items: [
            "reference/steps/quick-reference",
            "reference/steps/api-steps",
            "reference/steps/ui-steps",
            "reference/steps/tui-steps",
            "reference/steps/hybrid-steps",
            "reference/steps/shared-steps",
          ],
        },
      ],
    },
    {
      type: "category",
      label: "Contributing",
      items: [
        "contributing/CONTRIBUTING",
        "contributing/development-setup",
        "contributing/coding-standards",
        "contributing/testing",
        "contributing/adding-ports",
        "contributing/adding-adapters",
        "contributing/adding-steps",
        "contributing/release-process",
      ],
    },
  ],
};

export default sidebars;
