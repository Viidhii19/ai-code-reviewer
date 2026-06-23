# Contributing to RepoSage VS Code Extension

Thank you for your interest in contributing to the RepoSage VS Code extension!

## Prerequisites

- Node.js 18+
- VS Code 1.85.0+
- NPM

## Setup

1. Clone the repository and navigate to the extension:
   ```bash
   git clone https://github.com/kalyan-1845/ai-code-reviewer.git
   cd ai-code-reviewer/vscode-extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Open the project in VS Code:
   ```bash
   code .
   ```

## Development Workflow

- **Compile**: `npm run compile` — bundles the extension with esbuild
- **Watch**: `npm run watch` — auto-rebuilds on file changes
- **Lint**: `npm run lint` — TypeScript type-checking
- **Package**: Run `vsce package` to create a `.vsix` file

## Running the Extension

Press `F5` in VS Code to launch a new Extension Development Host window with the extension loaded.

## Running Tests

```bash
npm run test
```

## Project Structure

```
vscode-extension/
├── src/
│   ├── extension.ts        # Extension entry point & activation
│   ├── api.ts              # API client for RepoSage backend
│   ├── webviewProvider.ts  # Sidebar webview provider
│   └── test/               # Test suite
├── esbuild.js              # Bundler configuration
├── package.json            # Extension manifest & dependencies
└── tsconfig.json           # TypeScript configuration
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes with clear commit messages
4. Ensure the code passes `npm run lint`
5. Submit a pull request with a description of your changes

## Code Style

- Follow existing patterns in the codebase
- Use TypeScript with strict mode enabled
- Keep functions focused and well-named
- No commented-out code — use version control instead
