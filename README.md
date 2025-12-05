# Scratch Org Lens

A VS Code extension for managing Salesforce Scratch Orgs.

## Project Structure

This is a pnpm monorepo with the following structure:

```
scratch-org-lens/
├── packages/
│   ├── extension/     # VS Code extension
│   └── webviews/      # Svelte webview UI components
├── package.json       # Root package.json
└── pnpm-workspace.yaml
```

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 8.0.0

## Getting Started

1. Install dependencies:

```bash
pnpm install
```

2. Build the webviews:

```bash
pnpm build:webviews
```

3. Compile the extension:

```bash
pnpm compile
```

## Development

### Webviews Development

```bash
# Start dev server with hot reload
pnpm dev:webviews

# Run tests
pnpm test:webviews

# Build for production
pnpm build:webviews
```

### Extension Development

```bash
# Compile TypeScript
pnpm compile

# Watch mode
pnpm watch

# Run extension tests
pnpm test:extension
```

### Run All Tests

```bash
pnpm test
```

## Packaging for Production

### How Webviews Are Loaded

The extension uses a smart path resolution that works in both development and production:

- **Development (Monorepo):** Webviews are loaded from `../webviews/out` (sibling package)
- **Production (Packaged):** Webviews are loaded from `webviews/out` (inside extension package)

The `DashboardPanel` automatically detects which location exists and uses the appropriate path.

### Packaging Steps

1. **Build webviews:**
   ```bash
   pnpm build:webviews
   ```

2. **Package the extension:**
   ```bash
   cd packages/extension
   pnpm package
   ```

   This will:
   - Compile TypeScript (`pnpm compile`)
   - Copy webviews to `packages/extension/webviews/out` (`pnpm copy-webviews`)
   - Create `.vsix` file (`vsce package`)

3. **The packaged extension structure:**
   ```
   extension/
   ├── out/              # Compiled extension code
   ├── webviews/         # Copied webview build output
   │   └── out/
   │       ├── index.html
   │       └── assets/
   ├── resources/        # Extension resources
   └── package.json      # Extension manifest
   ```

### Important Files

- **`.vscodeignore`**: Excludes development files from the package (source files, tests, etc.)
- **`scripts/copy-webviews.js`**: Copies webviews before packaging
- **`vscode:prepublish`**: Automatically runs before packaging (via `vsce`)

## Testing the Extension

### Automated Tests

Run the extension's automated tests:

```bash
# Build webviews first (required for extension tests)
pnpm build:webviews

# Run extension tests
pnpm test:extension
```

This will:
1. Compile the extension TypeScript code
2. Download a VS Code instance (if needed)
3. Run the test suite in a VS Code Extension Host

### Manual Testing / Debugging

#### Option 1: Using VS Code Debugger (Recommended)

1. **Build everything first:**
   ```bash
   pnpm build:webviews
   pnpm compile
   ```

2. **Open the Run and Debug panel** (Cmd+Shift+D / Ctrl+Shift+D)

3. **Select "Run Extension"** from the dropdown and press F5

   This will:
   - Build webviews and compile extension (via pre-launch task)
   - Launch a new VS Code window with your extension loaded
   - Enable breakpoints and debugging

4. **To run tests in debug mode:**
   - Select "Extension Tests" from the dropdown
   - Set breakpoints in your test files
   - Press F5 to run tests with debugging

#### Option 2: Using Command Line

1. **Build everything:**
   ```bash
   pnpm build:webviews
   pnpm compile
   ```

2. **Open VS Code from the extension directory:**
   ```bash
   code packages/extension
   ```

3. **Press F5** to launch the extension in a new window

#### Option 3: Package and Install

1. **Build and package the extension** (if you have `vsce` installed):
   ```bash
   # From the root directory
   pnpm build:webviews
   cd packages/extension
   pnpm package
   ```
   
   Or manually:
   ```bash
   pnpm build:webviews
   cd packages/extension
   pnpm compile
   pnpm copy-webviews
   vsce package
   ```

2. **Install the `.vsix` file** in VS Code:
   - Open VS Code
   - Go to Extensions view
   - Click "..." menu → "Install from VSIX..."
   - Select the generated `.vsix` file

**Note:** The `package` script automatically:
- Compiles the extension TypeScript
- Copies webviews from `packages/webviews/out` to `packages/extension/webviews/out`
- Packages everything into a `.vsix` file

### Testing Checklist

Before testing, ensure:

- ✅ Webviews are built (`pnpm build:webviews`)
- ✅ Extension is compiled (`pnpm compile`)
- ✅ All dependencies are installed (`pnpm install`)

### Debugging Tips

- **Set breakpoints** in TypeScript files (`.ts`) - they will work after compilation
- **Check the Debug Console** for extension logs
- **Use `console.log()`** in extension code - output appears in the Debug Console
- **Webview debugging**: Right-click in the webview → "Inspect" to open DevTools
- **Extension Host logs**: Check the Output panel → select "Log (Extension Host)"

## Features

- Dashboard view for Scratch Org management
- Sidebar panel for quick access

## Extension Settings

Coming soon.

## Known Issues

None at this time.

## Release Notes

### 0.0.1

Initial development release.

---

**Enjoy!**
