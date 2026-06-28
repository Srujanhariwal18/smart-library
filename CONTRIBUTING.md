# Contributing to Smart Library

Thank you for your interest in contributing! Please follow these guidelines to keep the codebase clean and maintainable.

## Getting Started
Please refer to the setup steps documented in the [README.md](file:///c:/Users/hp/.gemini/antigravity/scratch/smart-library/README.md) file to configure your local developer mode environment and start frontend/backend servers.

## Branch Naming
When creating a new branch, please follow these prefixes:
- `feature/name-of-feature` for new attributes/additions
- `fix/name-of-bug` for bug fixes
- `chore/task-name` for updates to config files or meta maintenance

## Commit Style
We write clean commit messages using Conventional Commits style:
- `feat:` for new capabilities or attributes
- `fix:` for fixing bugs or unexpected behavior
- `chore:` for updating configs, dependencies, or metadata
- `docs:` for markdown changes or documentation edits

## Pull Request Rules
- All pull requests must target the `dev` branch. Direct merges into the `main` branch are restricted.
- Ensure that you fill out the pull request template entirely before submission.

## Code Style
- Follow the existing TailwindCSS styling patterns and glassmorphism layouts.
- Do not write inline styles.
- Maintain React 19 standards.

## Database Guidelines
- When adding new Supabase tables, always declare them in [new_features_schema.sql](file:///c:/Users/hp/.gemini/antigravity/scratch/smart-library/new_features_schema.sql) only. Never modify the core `supabase_schema.sql` migration file.

## Role Guidelines
- Adding new user roles is strictly prohibited. If you want to introduce a role permission level, open an issue first to obtain admin approval.
