# Contributing to NVIDIA AI Infrastructure Simulator

Thank you for your interest in contributing to the NVIDIA AI Infrastructure Simulator! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Development Setup](#development-setup)
- [Code Standards](#code-standards)
- [Pull Request Process](#pull-request-process)
- [Code Review Checklist](#code-review-checklist)
- [Architecture Overview](#architecture-overview)
- [Getting Help](#getting-help)

---

## Development Setup

### Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 9.0.0 or higher
- **Git**: Latest stable version

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/nvidia-ai-infra-simulator.git
   cd nvidia-ai-infra-simulator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Playwright browsers** (for E2E tests)
   ```bash
   npx playwright install
   ```

### Running Locally

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production (TypeScript + Vite) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint with strict settings |
| `npm run test` | Run unit tests in watch mode |
| `npm run test:run` | Run unit tests once |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:ui` | Open Vitest UI |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:ui` | Open Playwright UI mode |
| `npm run test:e2e:debug` | Debug E2E tests |

---

## Code Standards

### TypeScript

- **Strict mode is enabled** - The project uses `strict: true` in `tsconfig.json`
- **Avoid `any` type** - Use proper types or `unknown` when type is truly unknown
- **Use path aliases** - Import from `@/*` instead of relative paths like `../../../`
- **No unused variables** - `noUnusedLocals` and `noUnusedParameters` are enforced

```typescript
// Good
import { SimulationStore } from '@/store/simulationStore';

// Avoid
import { SimulationStore } from '../../../store/simulationStore';
```

### React

- **Functional components only** - Do not use class components
- **Use hooks** - Leverage React hooks for state and side effects
- **Custom hooks** - Extract reusable logic into custom hooks in `src/hooks/`
- **Component files** - One component per file, named with PascalCase

```typescript
// Good - Functional component with hooks
const MyComponent: React.FC<Props> = ({ data }) => {
  const [state, setState] = useState<string>('');

  return <div>{state}</div>;
};
```

### Testing

- **Framework**: Vitest with React Testing Library
- **Coverage target**: Maintain 80%+ code coverage
- **Test file location**: Place tests in `__tests__/` directories adjacent to source files
- **Test naming**: Use `.test.ts` or `.test.tsx` extensions

```typescript
// Example test structure
describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<ComponentName />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    render(<ComponentName />);
    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

### Styling

- **Tailwind CSS** - Use Tailwind utility classes for styling
- **No inline styles** - Prefer Tailwind classes over inline style objects
- **Utility functions** - Use `clsx` and `tailwind-merge` for conditional classes
- **Responsive design** - Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`)

```typescript
// Good - Using Tailwind with clsx
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const className = twMerge(clsx(
  'px-4 py-2 rounded',
  isActive && 'bg-blue-500 text-white',
  isDisabled && 'opacity-50 cursor-not-allowed'
));
```

---

## Pull Request Process

### Branch Naming

Use descriptive branch names with prefixes:

| Prefix | Use Case | Example |
|--------|----------|---------|
| `feature/` | New features | `feature/add-nemo-simulator` |
| `fix/` | Bug fixes | `fix/terminal-scroll-issue` |
| `refactor/` | Code refactoring | `refactor/extract-base-simulator` |
| `docs/` | Documentation | `docs/add-api-reference` |
| `test/` | Test additions | `test/increase-coverage` |

### Commit Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(simulators): add NeMo framework simulator
fix(terminal): resolve scroll position reset on command
docs(readme): update installation instructions
test(store): add unit tests for learningStore
```

### Test Requirements

Before submitting a PR:

1. **All tests must pass**
   ```bash
   npm run test:run
   ```

2. **Lint must pass**
   ```bash
   npm run lint
   ```

3. **Build must succeed**
   ```bash
   npm run build
   ```

4. **Coverage should not decrease** - Maintain 80%+ coverage
   ```bash
   npm run test:coverage
   ```

### Review Process

1. Create a PR against the `main` branch
2. Fill out the PR template completely
3. Request review from at least one maintainer
4. Address all review comments
5. Ensure CI checks pass
6. Squash and merge when approved

---

## Code Review Checklist

Use this checklist when reviewing PRs:

### Functionality
- [ ] Code accomplishes the stated goal
- [ ] Edge cases are handled appropriately
- [ ] Error handling is implemented correctly

### Code Quality
- [ ] No `any` types (use proper types or `unknown`)
- [ ] No unused imports or variables
- [ ] Functions are reasonably sized (<50 lines preferred)
- [ ] Complex logic has explanatory comments

### Testing
- [ ] New code has corresponding tests
- [ ] Tests are meaningful (not just for coverage)
- [ ] Edge cases are tested
- [ ] Test descriptions are clear

### Performance
- [ ] No unnecessary re-renders in React components
- [ ] Heavy computations are memoized appropriately
- [ ] No memory leaks (cleanup in useEffect)

### Accessibility
- [ ] Interactive elements are keyboard accessible
- [ ] ARIA labels are provided where needed
- [ ] Color is not the only indicator of state
- [ ] Focus management is handled correctly

### Documentation
- [ ] Public APIs are documented with JSDoc
- [ ] Complex functions have explanatory comments
- [ ] README is updated if needed

---

## Architecture Overview

### Key Directories

```
src/
├── components/          # React UI components
│   ├── Terminal.tsx     # Main terminal emulator
│   ├── Dashboard.tsx    # Main dashboard view
│   └── ...
├── simulators/          # Command-line tool simulators
│   ├── BaseSimulator.ts # Abstract base class for simulators
│   ├── nvidiaSmiSimulator.ts
│   ├── dcgmiSimulator.ts
│   └── ...
├── store/               # Zustand state management
│   ├── simulationStore.ts    # Main simulation state
│   ├── learningStore.ts      # Learning progress tracking
│   └── scenarioContext.ts    # Scenario/exercise state
├── hooks/               # Custom React hooks
├── types/               # TypeScript type definitions
├── data/                # Static data and configurations
├── constants/           # Application constants
└── utils/               # Utility functions
```

### State Management

The project uses **Zustand** for state management:

- **`simulationStore`** - Manages GPU states, hardware configuration, and simulation metrics
- **`learningStore`** - Tracks user progress, completed exercises, and achievements
- **`scenarioContext`** - Manages active scenarios and exercise state

```typescript
// Example: Using the simulation store
import { useSimulationStore } from '@/store/simulationStore';

const MyComponent = () => {
  const { gpus, updateGpuMetrics } = useSimulationStore();
  // ...
};
```

### Adding a New Simulator

1. **Create the simulator file** in `src/simulators/`
   ```typescript
   // src/simulators/myToolSimulator.ts
   import { BaseSimulator } from './BaseSimulator';

   export class MyToolSimulator extends BaseSimulator {
     protected commandName = 'mytool';
     protected supportedCommands = ['status', 'config', 'run'];

     execute(args: string[]): string {
       // Parse arguments and return output
       const subcommand = args[0];

       switch (subcommand) {
         case 'status':
           return this.handleStatus(args.slice(1));
         case 'config':
           return this.handleConfig(args.slice(1));
         default:
           return this.showHelp();
       }
     }

     private handleStatus(args: string[]): string {
       // Implementation
     }

     private handleConfig(args: string[]): string {
       // Implementation
     }

     private showHelp(): string {
       return `Usage: mytool <command> [options]

Commands:
  status    Show current status
  config    Configure settings
  run       Execute operation`;
     }
   }
   ```

2. **Register the simulator** in the command dispatcher

3. **Add tests** in `src/simulators/__tests__/myToolSimulator.test.ts`

4. **Update documentation** if the tool is user-facing

---

## Getting Help

### Opening Issues

When opening an issue, please include:

- **Clear title** describing the problem or request
- **Description** with context and details
- **Steps to reproduce** (for bugs)
- **Expected vs actual behavior** (for bugs)
- **Environment details** (OS, Node version, browser)
- **Screenshots** if applicable

### Issue Templates

Use the appropriate issue template:

- **Bug Report** - For reporting bugs or unexpected behavior
- **Feature Request** - For suggesting new features or improvements
- **Documentation** - For documentation improvements or errors

### Communication

- **GitHub Issues** - For bugs, features, and discussions
- **Pull Request Comments** - For code-specific discussions
- **Code Review** - For feedback during the PR process

---

## License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to the NVIDIA AI Infrastructure Simulator!
