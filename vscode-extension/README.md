# RepoSage VS Code Extension

AI-powered code review assistant that analyzes your code for bugs, security vulnerabilities, and improvements — right inside VS Code.

## Features

- **Code Review**: Run `RepoSage: Review Current File` from the command palette to get AI-powered feedback on your active file
- **Sidebar Panel**: Review results are displayed in a dedicated sidebar view with syntax-highlighted markdown
- **Secure API Key Configuration**: Set your RepoSage API key via VS Code settings (`reposage.apiKey`)
- **Custom Backend URL**: Configure a custom API endpoint (`reposage.apiUrl`)

## Requirements

- VS Code 1.85.0 or higher
- A running RepoSage backend (default: `http://localhost:5000`)
- RepoSage API key (optional, for authenticated backends)

## Installation

1. Install the extension from the VS Code Marketplace
2. Open VS Code settings (`Ctrl+,` / `Cmd+,`)
3. Search for "RepoSage"
4. Set your `reposage.apiUrl` (default: `http://localhost:5000`)
5. Set your `reposage.apiKey` if required

## Usage

1. Open any file in the editor
2. Run `RepoSage: Review Current File` from the command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. View the AI-powered review results in the RepoSage sidebar panel

## Extension Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `reposage.apiUrl` | `http://localhost:5000` | RepoSage backend API base URL |
| `reposage.apiKey` | `""` | API key for RepoSage backend authentication |

## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md) for local development setup and contribution guidelines.
