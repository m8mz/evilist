# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `prettier --write .` - Format code (Prettier with Astro plugin configured)

## Architecture Overview

This is an Astro-based personal portfolio website with the following key characteristics:

### Tech Stack
- **Astro** - Main framework with SSG/SSR capabilities
- **React** - For interactive components (configured with JSX runtime)
- **TailwindCSS** - Styling via Vite plugin
- **TypeScript** - Strict configuration
- **SendGrid** - Email handling via server actions

### Project Structure
- `src/layouts/BaseLayout.astro` - Main layout with global styles, header, and back-to-top functionality
- `src/components/` - Reusable Astro components (Hero, Header, About, Projects)
- `src/pages/` - File-based routing with blog, contact, resume pages
- `src/actions/index.ts` - Server-side actions for form handling (contact form via SendGrid)
- `src/styles/` - Global CSS and component-specific styles

### Key Patterns
- Uses Astro's component frontmatter for TypeScript logic
- Server actions for form processing with Zod validation
- Global CSS with component-scoped styles
- React integration for interactive components when needed
- Font loading via Google Fonts (Raleway)

### Environment Variables
- `SENDGRID_API_KEY` - Required for contact form functionality

### Email Configuration
Contact form sends emails from `no-reply@evilist.co` to `m@evilist.co` using SendGrid API.

### Build Output
- Development toolbar disabled in Astro config
- TypeScript strict mode enabled
- Distribution builds to `dist/` directory (excluded from TypeScript compilation)

## Development Workflow Preferences

**Step-by-Step Approach:** When given a task or goal, break it down into smaller, manageable steps:

1. **Start with structure/layout** - Build the foundational structure first
2. **Gather specific requirements** - Ask clarifying questions about desired fields, features, or behaviors
3. **Implement incrementally** - Build piece by piece with user feedback between steps
4. **Wait for approval** - Get user confirmation before proceeding to the next step
5. **Refine and polish** - Make adjustments based on feedback

This approach ensures better control over the final result and avoids assumptions about requirements.