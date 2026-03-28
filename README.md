# PromptCLI

PromptCLI is a desktop terminal app for macOS and Windows that layers natural
language planning on top of real shell sessions. Users work in persistent tabs,
connect a model provider during onboarding, and review exact shell plans before
anything runs.

## What is in this repo

- Tauri 2 desktop shell in [src-tauri/src/main.rs](/Users/apple/Repos/OpenSource/PromptCLI/src-tauri/src/main.rs)
- React + TypeScript frontend in [src/app/App.tsx](/Users/apple/Repos/OpenSource/PromptCLI/src/app/App.tsx)
- Planner, intents, provider adapters, and policy code in [src/lib](/Users/apple/Repos/OpenSource/PromptCLI/src/lib)
- Unit tests in [tests/unit](/Users/apple/Repos/OpenSource/PromptCLI/tests/unit)

## Current v1 architecture

- Terminal-first workspace with persistent shell tabs
- Dedicated PromptCLI command bar for natural-language requests
- Onboarding for OpenAI or Anthropic provider setup
- Local settings storage plus OS keychain-backed API key storage
- Curated intents first, LLM shell planning as a fallback
- Always-preview-before-run safety model

## Getting started

1. Install Node.js dependencies with `npm install`.
2. Install the Rust toolchain for Tauri development.
3. Start the frontend with `npm run dev` or the desktop app with `npm run tauri:dev`.
4. Run tests with `npm test`.

## Important note

This scaffold is implemented end-to-end in the repo, but the current local
environment does not yet have the Rust toolchain installed, so desktop builds
cannot be verified until Rust is added.
