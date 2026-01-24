# GitHub Copilot Instructions for jahia-reporter

## Project Overview

jahia-reporter is an OCLIF-based CLI tool that ingests test reports (JUnit XML, Mocha JSON) and transforms them into a standardized data model for submission to various platforms (TestRail, Slack, ZenCrepes, PagerDuty).

## Architecture & Data Flow

### Core Data Model (`src/global.type.ts`)

The project uses a hierarchical test data model:

- **JRRun** → **JRReport** → **JRTestsuite** → **JRTestcase** → **JRTestfailure**
- All metrics bubble up from individual test cases to the run level
- Test status determination: `PASS` (no failures), `FAIL` (has failures), `SKIP`, `PENDING`

### Ingestion Pipeline (`src/utils/ingest/`)

1. **Input**: Multiple formats supported via `ingestReport()` function
2. **Parsing**: Format-specific parsers (`parse-xml-report.ts`, `parse-json-report.ts`, `parse-json-perf-report.ts`)
3. **Normalization**: All formats transformed to common JR\* interfaces
4. **Output**: Standardized data model for command consumption

## Command Structure Patterns

### OCLIF Command Convention

All commands extend `Command` from `@oclif/command` and follow this pattern:

```typescript
import { Command, flags } from '@oclif/command';

class JahiaCommandName extends Command {
  static description = 'Description here';
  static flags = {
    help: flags.help({ char: 'h' }),
    sourcePath: flags.string({
      description: 'A json/xml report or folder containing reports',
      required: true,
    }),
    sourceType: flags.string({
      char: 't',
      options: ['xml', 'json'],
      default: 'xml',
    }),
    // Command-specific flags...
  };

  async run() {
    const { flags } = this.parse(JahiaCommandName);
    const report = await ingestReport(
      flags.sourceType,
      flags.sourcePath,
      this.log.bind(this),
    );
    // Command logic using standardized report data...
  }
}

export = JahiaCommandName;
```

### Command Categories

- **Main commands** (`src/commands/`): Core reporting functionality (testrail, slack, zencrepes, etc.)
- **Utils commands** (`src/commands/utils/`): Jahia instance management (alive, modules, provision)
- **Performance commands** (`src/commands/perfs/`): Performance analysis and submission

## Key Development Patterns

### Jahia Integration Standard

Commands that interact with Jahia instances use consistent flag patterns:

```typescript
jahiaUrl: flags.string({
  description: 'Jahia GraphQL endpoint (i.e. http://localhost:8080/)',
  default: 'http://localhost:8080/',
}),
jahiaUsername: flags.string({default: 'root'}),
jahiaPassword: flags.string({default: 'root'}),
```

### Error Handling & Logging

- Use `this.log()` for command output (not console.log)
- Exit with `exit(1)` for validation failures
- Include performance timing with `performance.now()` for long operations

### File Processing Pattern

```typescript
// Check if path is file or directory
if (lstatSync(sourcePath).isFile()) {
  // Process single file
} else {
  // Use glob patterns for directory processing
  const files = glob.sync(pattern);
}
```

## Build & Development Workflow

### Essential Commands

- `yarn install` - Install dependencies (requires Corepack: `corepack enable`)
- `yarn run lint` - ESLint with TypeScript support (fixed to use compatible plugin versions)
- `yarn run test` - Jest with ts-jest preset
- `yarn run build` - TypeScript compilation
- `./bin/run <command> --help` - Test commands in development

### Package Manager Requirements

- Project uses Yarn 4.10.3 via `packageManager` field
- Must enable Corepack before running: `corepack enable`
- Uses Yarn PnP (Plug'n'Play) for dependency resolution

### Linting Configuration

- ESLint 8.57.1 with oclif and oclif-typescript configs
- Plugin versions locked for compatibility:
  - `eslint-plugin-unicorn@^48.0.1` (not 61.x)
  - `eslint-plugin-n@^15.1.0` (not 17.x)
  - `eslint-plugin-mocha@^10.5.0`

## Testing & CI

- Jest with TypeScript support via ts-jest
- Super Linter in CI for comprehensive code quality
- Test assets in `test/assets/` include JUnit XML samples for ingestion testing
- Use `./scripts/lint-local.sh` to run CI-equivalent linting locally

## External Integration Patterns

### Module Version Discovery

Use `utils:modules` command output as input for other commands via `moduleFilepath` flag - creates version JSON with Jahia platform and module details.

### Common Integration Flags

Most reporting commands support:

- `moduleFilepath` - JSON file from utils:modules command
- `runUrl` - Associated CI/build URL
- `version`/`dependencies` - Override version information
