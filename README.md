# Git Quest: Save the Timeline 🚀

An interactive educational game that teaches Git concepts through a sci-fi terminal simulation. Players take on the role of a Timekeeper Developer, traveling through a corrupted project timeline and restoring order by completing Git-based challenges.

## ✨ Features

### 🎮 Core Gameplay
- **5 Progressive Levels** covering all major Git concepts
- **Interactive Terminal Simulation** with realistic Git command validation
- **Sci-fi Narrative** with engaging storylines for each level
- **Achievement System** with unlockable badges
- **Progress Tracking** with localStorage persistence
- **Hint System** for learning Git concepts
- **Retro/Pixel Art UI** with terminal aesthetics

### 🎯 Enhanced User Experience
- **Keyboard Navigation**: Press any key to focus the terminal
- **Command History**: Use ↑/↓ arrows to navigate command history
- **Tab Completion**: Auto-complete common Git commands
- **Enhanced Command Recognition**: Supports 30+ Git commands
- **Shell Commands**: Basic shell commands (ls, pwd, clear, help)
- **Error Boundaries**: Graceful error handling with user-friendly messages

### 🛠️ Technical Improvements
- **TypeScript Migration**: Full TypeScript support with strict typing
- **Performance Optimizations**: React.memo, useCallback, useMemo
- **Comprehensive Testing**: Vitest + React Testing Library
- **Error Handling**: Proper error boundaries and validation
- **Code Quality**: ESLint + Prettier configuration
- **Modern Build**: Vite with code splitting and optimization

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/git-quest.git
cd git-quest

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run test         # Run tests
npm run test:ui      # Run tests with UI
npm run test:coverage # Run tests with coverage
npm run type-check   # TypeScript type checking
```

## 🎮 How to Play

### Basic Controls
- **Any Key**: Focus the terminal
- **Enter**: Execute command
- **↑/↓ Arrows**: Navigate command history
- **Tab**: Auto-complete commands

### Git Commands Supported
The terminal recognizes 30+ Git commands including:
- `git init` - Initialize repository
- `git config` - Configure user identity
- `git status` - Show repository status
- `git add` - Stage files
- `git commit` - Create commits
- `git log` - View commit history
- `git branch` - Manage branches
- `git checkout` - Switch branches
- `git merge` - Merge branches
- `git revert` - Revert commits
- `git reset` - Reset repository state
- `git tag` - Create tags
- `git push` - Push changes (simulated)
- And many more...

### Shell Commands
- `ls` / `dir` - List files
- `pwd` - Show current directory
- `clear` - Clear screen
- `help` - Show available commands
- `echo` - Display text

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: TailwindCSS with custom retro/terminal theme
- **State Management**: React Context + useReducer
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint + Prettier
- **Build Tool**: Vite with React plugin
- **Deployment**: Docker with nginx

### Project Structure
```
git-quest/
├── src/
│   ├── components/          # React components
│   │   ├── __tests__/      # Component tests
│   ├── contexts/           # React Context providers
│   ├── data/              # Static game data
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility classes and functions
│   │   ├── __tests__/     # Utility tests
│   ├── test/              # Test setup
│   └── assets/            # Static assets
├── public/                # Public assets
├── docker-compose.yml     # Docker configuration
├── Dockerfile            # Container definition
└── package.json          # Dependencies and scripts
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Type checking
npm run type-check
```

### Test Coverage
- Component rendering and interactions
- Git command simulation
- State management
- Error handling
- User interactions

## 🐳 Docker Deployment

### Development
```bash
# Start development environment
make start-dev

# Build production image
make build

# Run production container
make start

# Clean up
make clean
```

## 🎨 Customization

### Themes
The game uses a custom terminal theme with:
- **Terminal Green**: `#00ff41` (primary)
- **Cyan**: `#00d4aa` (secondary)
- **Warning**: `#ffb86c` (hints)
- **Error**: `#ff5555` (errors)
- **Background**: `#0a0e1a` (dark terminal)

### Adding New Git Commands
1. Add command to `GitSimulator` class in `src/utils/gitSimulator.ts`
2. Update type definitions in `src/types/game.ts`
3. Add completion logic to `LevelManager` in `src/utils/levelManager.ts`
4. Update level data in `src/data/levels.ts`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Use TypeScript for all new code
- Follow the established naming conventions
- Write tests for new features
- Maintain the retro/terminal aesthetic
- Use React.memo for performance-critical components
- Implement proper error handling

## 📚 Learning Resources

### Git Concepts Covered
- Repository initialization and configuration
- File staging and committing
- Branch management and merging
- History viewing and manipulation
- Conflict resolution
- Tagging and releases

### React Patterns Demonstrated
- Context API for state management
- Custom hooks for reusable logic
- Performance optimization techniques
- TypeScript integration
- Component composition patterns

## 🚀 Future Enhancements

### Planned Features
- **Sound Effects**: Audio feedback for interactions
- **Multiplayer Mode**: Collaborative timeline restoration
- **Advanced Git Commands**: Stash, rebase, cherry-pick
- **Custom Levels**: Level editor for user-generated content
- **PWA Support**: Installable as web app
- **Offline Support**: Service worker for offline play

### Technical Improvements
- **React 19 Features**: Leverage new React capabilities
- **Performance Monitoring**: Add performance tracking
- **Accessibility**: Improve screen reader support
- **Advanced Animations**: More sophisticated UI animations

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the need for better Git education
- Built with modern React and TypeScript best practices
- Designed for both learning and entertainment

---

**Note**: This project serves as both an educational tool for Git concepts and a demonstration of modern React development practices. The codebase follows industry best practices and can be used as a reference for similar educational game development projects.
