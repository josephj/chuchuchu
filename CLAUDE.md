# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Chu Chu Chu" is a browser extension (Chrome/Firefox) that summarizes web content using AI. It captures content from web articles, Slack threads, YouTube videos, and PDFs, then processes them through various AI providers (Anthropic, OpenAI, Groq, Ollama).

## Development Commands

### Build & Development
```bash
# Development (Chrome)
pnpm dev

# Development (Firefox) 
pnpm dev:firefox

# Production build (Chrome)
pnpm build

# Production build (Firefox)
pnpm build:firefox

# Create distribution zip
pnpm zip
pnpm zip:firefox
```

### Code Quality
```bash
# Type checking
pnpm type-check

# Linting with auto-fix
pnpm lint

# Code formatting
pnpm prettier
```

### Testing
```bash
# E2E tests (Chrome)
pnpm e2e

# E2E tests (Firefox)
pnpm e2e:firefox
```

### Package Management
```bash
# Clean and reinstall dependencies
pnpm clean:install

# Install dependency for root workspace
pnpm i <package> -w

# Install dependency for specific module
pnpm i <package> -F <module-name>
```

## Architecture

### Monorepo Structure
- **Turborepo** manages the multi-package workspace
- **pnpm** (v9.9.0+) for dependency management
- **Vite** + **TypeScript** + **React 18** stack

### Core Directories

#### `/chrome-extension/`
Extension manifest and background scripts (service worker)

#### `/pages/`
Extension UI pages:
- `side-panel/` - Main AI chat interface (Chrome 114+)
- `content/` - Content scripts for web page interaction
- `content-ui/` - React components injected into pages
- `popup/` - Browser toolbar popup
- `options/` - Extension settings page
- `new-tab/` - Custom new tab override

#### `/packages/`
Shared libraries:
- `shared/` - Common utilities, hooks, components
- `storage/` - Chrome storage API helpers and AI "hats" (personas)
- `i18n/` - Internationalization support
- `ui/` - Shared UI components

### Key Technologies
- **React 18** with **Tailwind CSS** and **Chakra UI**
- **Chrome Extensions Manifest V3**
- **Mozilla Readability** for article extraction
- **WebDriverIO** for E2E testing

### AI Integration
The extension supports multiple AI providers through a unified interface:
- Anthropic (Claude)
- OpenAI (GPT models) 
- Groq
- Ollama (local AI)

### Content Capture
- Web articles using Mozilla Readability
- Slack threads
- YouTube video transcripts
- PDF documents
- Zoom meeting content

## Development Notes

### Environment Variables
Copy `.example.env` to `.env` and prefix variables with `VITE_`. Add type definitions to `vite-env.d.ts`.

### Browser Loading
- **Chrome**: Load unpacked from `dist/` directory at `chrome://extensions`
- **Firefox**: Load temporary add-on from `dist/manifest.json` at `about:debugging`

### Testing
Only E2E tests exist (no unit tests). Tests cover all major extension pages and functionality across Chrome and Firefox.

### Hot Module Reload
Custom HMR plugin supports extension reloading during development. If HMR freezes, restart `pnpm dev`.