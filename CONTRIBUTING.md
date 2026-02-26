# Contributing to Creators System

First off, thank you for considering contributing to Creators System! It's people like you that make this project better.

## Code of Conduct

This project and everyone participating in it is governed by our commitment to creating a welcoming environment. Please be respectful and constructive in all interactions.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

**When reporting a bug, include:**
- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Screenshots if applicable
- Your environment (OS, browser, Node.js version)

### Suggesting Features

Feature suggestions are welcome! Please:
- Check if the feature has already been suggested
- Provide a clear description of the feature
- Explain why this feature would be useful
- Consider how it fits with the project's goals

### Pull Requests

1. **Fork the repo** and create your branch from `main`
2. **Install dependencies**: `npm install`
3. **Make your changes**
4. **Test your changes**: `npm run build`
5. **Lint your code**: `npm run lint`
6. **Commit with a clear message**
7. **Push to your fork** and submit a pull request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/CreatorsSystem.git
cd CreatorsSystem

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Start dev server
npm run dev
```

## Style Guidelines

### TypeScript

- Use TypeScript strict mode
- Prefer `interface` over `type` for object shapes
- Use explicit return types for functions
- Avoid `any` - use proper types or `unknown`

### React

- Use functional components with hooks
- Keep components small and focused
- Use meaningful component names
- Extract reusable logic into custom hooks

### CSS (Tailwind)

- Use Tailwind utility classes
- Follow the existing dark theme conventions
- Use the custom color variables (`surface-*`, `primary`, etc.)
- Keep responsive design in mind

### Git Commits

- Use clear, descriptive commit messages
- Start with a verb: "Add", "Fix", "Update", "Remove"
- Keep commits focused on a single change

**Good:**
```
Add task deadline notifications
Fix leaderboard sorting bug
Update user profile validation
```

**Bad:**
```
fixed stuff
updates
WIP
```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/          # Page-level components
├── stores/         # Zustand state stores
├── lib/            # Utilities and clients
└── types/          # TypeScript type definitions
```

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

Thank you for contributing! 🎉
