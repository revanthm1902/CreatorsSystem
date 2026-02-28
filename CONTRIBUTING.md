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

- Use Tailwind CSS v4 utility classes
- Follow the CSS variable theming system (`var(--text-primary)`, `var(--bg-card)`, etc.)
- Use responsive breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px)
- Mobile-first: design for small screens first, then expand with breakpoints
- Use inline `style={{ }}` for CSS variable usage where Tailwind doesn't support it directly
- Keep touch targets at minimum 44px for mobile

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

## Project Architecture

```
src/
├── components/         # Reusable UI components
│   ├── dashboard/      # Role-specific dashboards, ActivityFeed
│   ├── layout/         # Sidebar, DashboardLayout (with mobile header)
│   ├── routing/        # ProtectedRoute
│   └── tasks/          # TaskCard, TaskCountdown, CreateTaskModal, EditTaskModal
├── pages/              # Page-level components
├── stores/             # Zustand state stores (auth, task, user, activity, theme)
├── lib/                # Supabase client config
└── types/              # TypeScript type definitions (database.ts)
```

### Key Conventions

- **State management**: Zustand stores with caching (`CACHE_DURATION`) and `force` refresh pattern
- **Activity logging**: All significant actions log to `activity_log` table via `logActivity()` helper
- **Task workflow**: Pending → Under Review → Completed/Rejected/Reassigned — admin-gated approval
- **Tokens**: Only Users earn tokens; Directors and Admins do not have token balances
- **Roles**: Director > Admin > User — each has specific permissions enforced in both UI and RLS policies

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

Thank you for contributing! 🎉
