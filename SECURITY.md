# Security Policy

## Reporting a Vulnerability

We take the security of the Smart Library College Management System seriously. If you find a security vulnerability, please do not open a public GitHub issue. Instead, report it responsibly by contacting the maintainers directly.

Please send your security reports to: **[your-email@domain.com]**

## Scope

The following vulnerabilities are considered within scope:
- Supabase Row Level Security (RLS) bypasses leading to data leaks or unauthorized mutations
- Clerk Authentication bypasses
- Exposed production environmental variables or API keys

## Out of Scope

The following are considered out of scope:
- Vulnerabilities or security gaps occurring exclusively in the **Local Mock Developer Mode** (Express + SQLite backend) as it is designed for development and mock simulation purposes only.
