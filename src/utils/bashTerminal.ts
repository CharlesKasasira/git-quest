import { GitRepository, GitVisualChange, TerminalFileEntry, TerminalState } from '../types/game';
import { GitSimulator } from './gitSimulator';

export const BASH_COMMANDS = [
  'alias',
  'cat',
  'cd',
  'clear',
  'cp',
  'date',
  'echo',
  'env',
  'export',
  'git',
  'grep',
  'head',
  'help',
  'history',
  'hostname',
  'ls',
  'mkdir',
  'mv',
  'pwd',
  'rm',
  'sort',
  'tail',
  'touch',
  'tree',
  'unalias',
  'uname',
  'uniq',
  'wc',
  'whoami',
] as const;

type ChainOperator = 'start' | 'sequence' | 'and' | 'or';

interface CommandSegment {
  operator: ChainOperator;
  command: string;
}

interface CommandOutput {
  output: string;
  success: boolean;
  exitCode: number;
  newRepo?: GitRepository;
  currentDirectory?: string;
  environment?: Record<string, string>;
  aliases?: Record<string, string>;
  fileSystem?: TerminalFileEntry[];
  feedback?: string;
  visualChanges?: GitVisualChange[];
  clearHistory?: boolean;
}

export interface BashExecutionResult {
  output: string;
  success: boolean;
  exitCode: number;
  newRepo: GitRepository;
  currentDirectory: string;
  environment: Record<string, string>;
  aliases: Record<string, string>;
  fileSystem: TerminalFileEntry[];
  feedback?: string;
  visualChanges?: GitVisualChange[];
  clearHistory?: boolean;
}

interface BashRuntime {
  repo: GitRepository;
  currentDirectory: string;
  environment: Record<string, string>;
  aliases: Record<string, string>;
  fileSystem: TerminalFileEntry[];
  history: string[];
  gitSimulator: GitSimulator;
}

const homeDirectory = '/timeline-project';

const nowEntry = (): Pick<TerminalFileEntry, 'createdAt' | 'updatedAt'> => {
  const now = new Date();
  return { createdAt: now, updatedAt: now };
};

export const createDefaultEnvironment = (): Record<string, string> => ({
  HOME: homeDirectory,
  HOSTNAME: 'git-quest',
  LANG: 'en_US.UTF-8',
  PATH: '/usr/local/bin:/usr/bin:/bin:/timeline-project/bin',
  PWD: homeDirectory,
  SHELL: '/bin/bash',
  TERM: 'xterm-256color',
  USER: 'timekeeper',
});

export const createDefaultFileSystem = (): TerminalFileEntry[] => [
  { path: homeDirectory, type: 'directory', ...nowEntry() },
  { path: `${homeDirectory}/README.md`, type: 'file', content: 'Git Quest training workspace\n', ...nowEntry() },
  { path: `${homeDirectory}/bin`, type: 'directory', ...nowEntry() },
];

export const createPrompt = (state: Pick<TerminalState, 'currentDirectory' | 'environment'>): string => {
  const user = state.environment.USER || 'timekeeper';
  const host = state.environment.HOSTNAME || 'git-quest';
  const home = state.environment.HOME || homeDirectory;
  const cwd = state.currentDirectory === home
    ? '~'
    : state.currentDirectory.startsWith(`${home}/`)
      ? `~/${state.currentDirectory.slice(home.length + 1)}`
      : state.currentDirectory;

  return `${user}@${host}:${cwd}$`;
};

const tokenize = (input: string): string[] => {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let escaped = false;

  for (const char of input) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\' && quote !== "'") {
      escaped = true;
      continue;
    }

    if ((char === '"' || char === "'") && (!quote || quote === char)) {
      quote = quote ? null : char;
      continue;
    }

    if (/\s/.test(char) && !quote) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
};

const splitCommandChain = (input: string): CommandSegment[] => {
  const segments: CommandSegment[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let operator: ChainOperator = 'start';
  let escaped = false;

  const push = () => {
    const command = current.trim();
    if (command) {
      segments.push({ operator, command });
    }
    current = '';
  };

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\' && quote !== "'") {
      current += char;
      escaped = true;
      continue;
    }

    if ((char === '"' || char === "'") && (!quote || quote === char)) {
      quote = quote ? null : char;
      current += char;
      continue;
    }

    if (!quote && char === '&' && next === '&') {
      push();
      operator = 'and';
      index += 1;
      continue;
    }

    if (!quote && char === '|' && next === '|') {
      push();
      operator = 'or';
      index += 1;
      continue;
    }

    if (!quote && char === ';') {
      push();
      operator = 'sequence';
      continue;
    }

    current += char;
  }

  push();
  return segments;
};

const splitPipeline = (input: string): string[] => {
  const parts: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let escaped = false;

  for (const char of input) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\' && quote !== "'") {
      current += char;
      escaped = true;
      continue;
    }

    if ((char === '"' || char === "'") && (!quote || quote === char)) {
      quote = quote ? null : char;
      current += char;
      continue;
    }

    if (char === '|' && !quote) {
      parts.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
};

const expandToken = (token: string, runtime: BashRuntime): string =>
  token
    .replace(/^~(?=\/|$)/, runtime.environment.HOME || homeDirectory)
    .replace(/\$\?/g, runtime.environment['?'] || '0')
    .replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_match, key: string) => runtime.environment[key] ?? '');

const normalizePath = (path: string): string => {
  const parts: string[] = [];
  path.split('/').forEach((part) => {
    if (!part || part === '.') {
      return;
    }
    if (part === '..') {
      parts.pop();
      return;
    }
    parts.push(part);
  });

  return `/${parts.join('/')}`;
};

const resolvePath = (path: string | undefined, runtime: BashRuntime): string => {
  if (!path || path === '~') {
    return runtime.environment.HOME || homeDirectory;
  }

  const expanded = expandToken(path, runtime);
  return normalizePath(expanded.startsWith('/') ? expanded : `${runtime.currentDirectory}/${expanded}`);
};

const displayPath = (path: string, runtime: BashRuntime): string => {
  const home = runtime.environment.HOME || homeDirectory;
  if (path === home) {
    return '~';
  }
  return path.startsWith(`${home}/`) ? `~/${path.slice(home.length + 1)}` : path;
};

const basename = (path: string): string => path.split('/').filter(Boolean).pop() || '/';

const dirname = (path: string): string => {
  const normalized = normalizePath(path);
  const parts = normalized.split('/').filter(Boolean);
  parts.pop();
  return `/${parts.join('/')}` || '/';
};

const getRepoFilePath = (fileName: string, runtime: BashRuntime): string =>
  normalizePath(`${runtime.environment.HOME || homeDirectory}/${fileName}`);

const getFileContent = (path: string, runtime: BashRuntime): string | undefined => {
  const fileSystemEntry = runtime.fileSystem.find((entry) => entry.path === path && entry.type === 'file');
  if (fileSystemEntry) {
    return fileSystemEntry.content ?? '';
  }

  const home = runtime.environment.HOME || homeDirectory;
  const repoRelativePath = path.startsWith(`${home}/`) ? path.slice(home.length + 1) : path;
  const repoFile = runtime.repo.files.find((file) => file.name === repoRelativePath);
  return repoFile?.content;
};

const upsertFileSystemEntry = (
  fileSystem: TerminalFileEntry[],
  entry: Omit<TerminalFileEntry, 'createdAt' | 'updatedAt'>,
): TerminalFileEntry[] => {
  const existing = fileSystem.find((candidate) => candidate.path === entry.path);
  const timestamps = nowEntry();
  if (existing) {
    return fileSystem.map((candidate) =>
      candidate.path === entry.path
        ? {
            ...candidate,
            ...entry,
            createdAt: candidate.createdAt,
            updatedAt: timestamps.updatedAt,
          }
        : candidate
    );
  }

  return [...fileSystem, { ...entry, ...timestamps }];
};

const writeRepoFile = (runtime: BashRuntime, path: string, content: string, append: boolean): void => {
  const home = runtime.environment.HOME || homeDirectory;
  if (!path.startsWith(home)) {
    return;
  }

  const fileName = path === home ? '' : path.slice(home.length + 1);
  if (!fileName || fileName.includes('/')) {
    return;
  }

  const existing = runtime.repo.files.find((file) => file.name === fileName);
  const nextContent = append && existing ? `${existing.content}${content}` : content;
  runtime.repo = {
    ...runtime.repo,
    files: existing
      ? runtime.repo.files.map((file) =>
          file.name === fileName
            ? {
                ...file,
                content: nextContent,
                staged: false,
                modified: true,
                status: file.tracked === false || file.status === 'untracked' ? 'untracked' : 'modified',
              }
            : file
        )
      : [
          ...runtime.repo.files,
          {
            name: fileName,
            content: nextContent,
            staged: false,
            modified: true,
            tracked: false,
            status: 'untracked',
          },
        ],
  };
};

const writeFile = (runtime: BashRuntime, path: string, content: string, append = false): void => {
  const existingContent = append ? getFileContent(path, runtime) ?? '' : '';
  const nextContent = `${existingContent}${content}`;
  runtime.fileSystem = upsertFileSystemEntry(runtime.fileSystem, {
    path,
    type: 'file',
    content: nextContent,
  });
  writeRepoFile(runtime, path, nextContent, false);
};

const listDirectory = (runtime: BashRuntime, path: string, showAll: boolean): string[] => {
  const home = runtime.environment.HOME || homeDirectory;
  const directEntries = runtime.fileSystem
    .filter((entry) => dirname(entry.path) === path && entry.path !== path)
    .map((entry) => entry.type === 'directory' ? `${basename(entry.path)}/` : basename(entry.path));

  const repoEntries = path === home
    ? runtime.repo.files.map((file) => file.name)
    : [];

  const entries = [...new Set([...directEntries, ...repoEntries])]
    .filter((entry) => showAll || !entry.startsWith('.'))
    .sort((left, right) => left.localeCompare(right));

  return showAll ? ['.', '..', ...entries] : entries;
};

const parseRedirection = (tokens: string[]): { tokens: string[]; target?: string; append: boolean } => {
  const redirectIndex = tokens.findIndex((token) => token === '>' || token === '>>');
  if (redirectIndex === -1) {
    return { tokens, append: false };
  }

  const target = tokens[redirectIndex + 1];
  return {
    tokens: tokens.slice(0, redirectIndex),
    ...(target ? { target } : {}),
    append: tokens[redirectIndex] === '>>',
  };
};

const applyAlias = (tokens: string[], runtime: BashRuntime): string[] => {
  const [command, ...args] = tokens;
  if (!command || !runtime.aliases[command]) {
    return tokens;
  }

  return [...tokenize(runtime.aliases[command]), ...args];
};

const executeBuiltIn = (tokens: string[], runtime: BashRuntime, pipedInput = ''): CommandOutput | null => {
  const [command = '', ...args] = tokens;

  switch (command) {
    case 'pwd':
      return { output: runtime.currentDirectory, success: true, exitCode: 0 };

    case 'cd': {
      const targetPath = resolvePath(args[0], runtime);
      const exists = targetPath === '/' || runtime.fileSystem.some((entry) => entry.path === targetPath && entry.type === 'directory');
      if (!exists) {
        return { output: `bash: cd: ${args[0] ?? ''}: No such file or directory`, success: false, exitCode: 1 };
      }

      return {
        output: '',
        success: true,
        exitCode: 0,
        currentDirectory: targetPath,
        environment: { ...runtime.environment, PWD: targetPath, OLDPWD: runtime.currentDirectory },
      };
    }

    case 'ls': {
      const showAll = args.some((arg) => arg.includes('a'));
      const long = args.some((arg) => arg.includes('l'));
      const target = args.find((arg) => !arg.startsWith('-'));
      const targetPath = resolvePath(target, runtime);
      const entries = listDirectory(runtime, targetPath, showAll);
      const output = long
        ? entries.map((entry) => `${entry.endsWith('/') ? 'drwxr-xr-x' : '-rw-r--r--'}  1 timekeeper staff ${entry.endsWith('/') ? 0 : 42} ${entry}`).join('\n')
        : entries.join('  ');
      return { output, success: true, exitCode: 0 };
    }

    case 'mkdir': {
      const parents = args.includes('-p');
      const targets = args.filter((arg) => arg !== '-p');
      if (targets.length === 0) {
        return { output: 'mkdir: missing operand', success: false, exitCode: 1 };
      }

      targets.forEach((target) => {
        const path = resolvePath(target, runtime);
        const parent = dirname(path);
        const parentExists = runtime.fileSystem.some((entry) => entry.path === parent && entry.type === 'directory') || parent === '/';
        if (parents || parentExists) {
          runtime.fileSystem = upsertFileSystemEntry(runtime.fileSystem, { path, type: 'directory' });
        }
      });
      return { output: '', success: true, exitCode: 0, fileSystem: runtime.fileSystem };
    }

    case 'touch': {
      const target = args[0];
      if (!target) {
        return { output: 'touch: missing file operand', success: false, exitCode: 1 };
      }
      const path = resolvePath(target, runtime);
      writeFile(runtime, path, getFileContent(path, runtime) ?? '');
      return { output: '', success: true, exitCode: 0, newRepo: runtime.repo, fileSystem: runtime.fileSystem };
    }

    case 'cat': {
      const targets = args.length > 0 ? args : [];
      if (targets.length === 0) {
        return { output: pipedInput, success: true, exitCode: 0 };
      }

      const chunks = targets.map((target) => {
        const path = resolvePath(target, runtime);
        const content = getFileContent(path, runtime);
        return content === undefined ? `cat: ${target}: No such file or directory` : content;
      });
      const failed = chunks.some((chunk, index) => getFileContent(resolvePath(targets[index], runtime), runtime) === undefined);
      return { output: chunks.join('\n'), success: !failed, exitCode: failed ? 1 : 0 };
    }

    case 'echo':
      return { output: args.join(' '), success: true, exitCode: 0 };

    case 'export': {
      if (args.length === 0) {
        return {
          output: Object.entries(runtime.environment).map(([key, value]) => `declare -x ${key}="${value}"`).join('\n'),
          success: true,
          exitCode: 0,
        };
      }

      const environment = { ...runtime.environment };
      args.forEach((assignment) => {
        const [key, ...valueParts] = assignment.split('=');
        if (key) {
          environment[key] = valueParts.join('=');
        }
      });
      return { output: '', success: true, exitCode: 0, environment };
    }

    case 'env':
      return {
        output: Object.entries(runtime.environment).map(([key, value]) => `${key}=${value}`).join('\n'),
        success: true,
        exitCode: 0,
      };

    case 'alias': {
      if (args.length === 0) {
        return {
          output: Object.entries(runtime.aliases).map(([key, value]) => `alias ${key}='${value}'`).join('\n'),
          success: true,
          exitCode: 0,
        };
      }

      const aliases = { ...runtime.aliases };
      args.forEach((assignment) => {
        const [key, ...valueParts] = assignment.split('=');
        if (key && valueParts.length > 0) {
          aliases[key] = valueParts.join('=');
        }
      });
      return { output: '', success: true, exitCode: 0, aliases };
    }

    case 'unalias': {
      const aliases = { ...runtime.aliases };
      args.forEach((name) => {
        delete aliases[name];
      });
      return { output: '', success: true, exitCode: 0, aliases };
    }

    case 'history':
      return {
        output: runtime.history.map((entry, index) => `${String(index + 1).padStart(5, ' ')}  ${entry}`).join('\n'),
        success: true,
        exitCode: 0,
      };

    case 'clear':
      return { output: '', success: true, exitCode: 0, clearHistory: true };

    case 'rm': {
      const recursive = args.includes('-r') || args.includes('-rf') || args.includes('-fr');
      const force = args.includes('-f') || args.includes('-rf') || args.includes('-fr');
      const targets = args.filter((arg) => !arg.startsWith('-'));
      if (targets.length === 0) {
        return { output: 'rm: missing operand', success: false, exitCode: 1 };
      }

      const messages: string[] = [];
      targets.forEach((target) => {
        const path = resolvePath(target, runtime);
        const entry = runtime.fileSystem.find((candidate) => candidate.path === path);
        if (!entry && !force) {
          messages.push(`rm: cannot remove '${target}': No such file or directory`);
          return;
        }
        if (entry?.type === 'directory' && !recursive) {
          messages.push(`rm: cannot remove '${target}': Is a directory`);
          return;
        }
        runtime.fileSystem = runtime.fileSystem.filter((candidate) => candidate.path !== path && !candidate.path.startsWith(`${path}/`));
      });
      return { output: messages.join('\n'), success: messages.length === 0, exitCode: messages.length === 0 ? 0 : 1, fileSystem: runtime.fileSystem };
    }

    case 'cp':
    case 'mv': {
      const source = args[0];
      const destination = args[1];
      if (!source || !destination) {
        return { output: `${command}: missing file operand`, success: false, exitCode: 1 };
      }
      const sourcePath = resolvePath(source, runtime);
      const destinationPath = resolvePath(destination, runtime);
      const content = getFileContent(sourcePath, runtime);
      if (content === undefined) {
        return { output: `${command}: cannot stat '${source}': No such file or directory`, success: false, exitCode: 1 };
      }
      writeFile(runtime, destinationPath, content);
      if (command === 'mv') {
        runtime.fileSystem = runtime.fileSystem.filter((entry) => entry.path !== sourcePath);
      }
      return { output: '', success: true, exitCode: 0, newRepo: runtime.repo, fileSystem: runtime.fileSystem };
    }

    case 'grep': {
      const pattern = args.find((arg) => !arg.startsWith('-')) ?? '';
      const ignoreCase = args.includes('-i');
      const source = args.length > 1 ? getFileContent(resolvePath(args[args.length - 1], runtime), runtime) ?? pipedInput : pipedInput;
      const matcher = new RegExp(pattern, ignoreCase ? 'i' : undefined);
      return {
        output: source.split('\n').filter((line) => matcher.test(line)).join('\n'),
        success: true,
        exitCode: 0,
      };
    }

    case 'head':
    case 'tail': {
      const countIndex = args.indexOf('-n');
      const count = countIndex >= 0 ? Number(args[countIndex + 1]) : 10;
      const lines = pipedInput.split('\n');
      return {
        output: (command === 'head' ? lines.slice(0, count) : lines.slice(-count)).join('\n'),
        success: true,
        exitCode: 0,
      };
    }

    case 'wc': {
      const lines = pipedInput ? pipedInput.split('\n').filter(Boolean).length : 0;
      const words = pipedInput ? pipedInput.trim().split(/\s+/).filter(Boolean).length : 0;
      const bytes = pipedInput.length;
      return { output: args.includes('-l') ? String(lines) : `${lines} ${words} ${bytes}`, success: true, exitCode: 0 };
    }

    case 'sort':
      return { output: pipedInput.split('\n').sort().join('\n'), success: true, exitCode: 0 };

    case 'uniq':
      return { output: [...new Set(pipedInput.split('\n'))].join('\n'), success: true, exitCode: 0 };

    case 'tree': {
      const entries = listDirectory(runtime, runtime.currentDirectory, false);
      return { output: `.\n${entries.map((entry) => `|-- ${entry}`).join('\n')}`, success: true, exitCode: 0 };
    }

    case 'whoami':
      return { output: runtime.environment.USER || 'timekeeper', success: true, exitCode: 0 };

    case 'hostname':
      return { output: runtime.environment.HOSTNAME || 'git-quest', success: true, exitCode: 0 };

    case 'date':
      return { output: new Date().toString(), success: true, exitCode: 0 };

    case 'uname':
      return { output: args.includes('-a') ? 'GitQuest 1.0.0 x86_64 browser bash' : 'GitQuest', success: true, exitCode: 0 };

    case 'help':
      return {
        output: `Git Quest Bash supports: ${BASH_COMMANDS.join(', ')}\nShell syntax: quotes, $VARS, ~, ;, &&, ||, pipes, >, >>`,
        success: true,
        exitCode: 0,
      };

    default:
      return null;
  }
};

const applyCommandOutput = (runtime: BashRuntime, result: CommandOutput): void => {
  if (result.newRepo) {
    runtime.repo = result.newRepo;
  }
  if (result.currentDirectory) {
    runtime.currentDirectory = result.currentDirectory;
  }
  if (result.environment) {
    runtime.environment = result.environment;
  }
  if (result.aliases) {
    runtime.aliases = result.aliases;
  }
  if (result.fileSystem) {
    runtime.fileSystem = result.fileSystem;
  }
};

const executeSimpleCommand = (commandText: string, runtime: BashRuntime, pipedInput = ''): CommandOutput => {
  const rawTokens = tokenize(commandText).map((token) => expandToken(token, runtime));
  const aliasedTokens = applyAlias(rawTokens, runtime);
  const redirection = parseRedirection(aliasedTokens);
  const tokens = redirection.tokens;
  const [command = '', ...args] = tokens;

  if (!command) {
    return { output: '', success: true, exitCode: 0 };
  }

  let result = executeBuiltIn(tokens, runtime, pipedInput);
  if (!result && command === 'git') {
    result = runtime.gitSimulator.executeCommand(command, args, runtime.repo);
    result = {
      ...result,
      exitCode: result.success ? 0 : 1,
    };
  }

  if (!result) {
    result = {
      output: `bash: ${command}: command not found`,
      success: false,
      exitCode: 127,
    };
  }

  applyCommandOutput(runtime, result);

  if (redirection.target) {
    writeFile(runtime, resolvePath(redirection.target, runtime), result.output ? `${result.output}\n` : '', redirection.append);
    return {
      ...result,
      output: '',
      newRepo: runtime.repo,
      fileSystem: runtime.fileSystem,
    };
  }

  return result;
};

const executePipeline = (commandText: string, runtime: BashRuntime): CommandOutput => {
  const commands = splitPipeline(commandText);
  let output = '';
  let result: CommandOutput = { output: '', success: true, exitCode: 0 };

  commands.forEach((command, index) => {
    result = executeSimpleCommand(command, runtime, index === 0 ? '' : output);
    output = result.output;
  });

  return { ...result, output };
};

export const runBashScript = (
  input: string,
  state: TerminalState,
  gitSimulator: GitSimulator
): BashExecutionResult => {
  const runtime: BashRuntime = {
    repo: state.currentRepo,
    currentDirectory: state.currentDirectory,
    environment: {
      ...createDefaultEnvironment(),
      ...state.environment,
      PWD: state.currentDirectory,
      '?': String(state.lastExitCode),
    },
    aliases: { ...state.aliases },
    fileSystem: state.fileSystem.length > 0 ? state.fileSystem.map((entry) => ({ ...entry })) : createDefaultFileSystem(),
    history: state.history.map((entry) => entry.command),
    gitSimulator,
  };

  const outputs: string[] = [];
  const feedback: string[] = [];
  const visualChanges: GitVisualChange[] = [];
  let lastExitCode = 0;
  let clearHistory = false;

  splitCommandChain(input).forEach((segment) => {
    if (segment.operator === 'and' && lastExitCode !== 0) {
      return;
    }
    if (segment.operator === 'or' && lastExitCode === 0) {
      return;
    }

    const result = executePipeline(segment.command, runtime);
    lastExitCode = result.exitCode;
    runtime.environment['?'] = String(lastExitCode);

    if (result.output) {
      outputs.push(result.output);
    }
    if (result.feedback) {
      feedback.push(result.feedback);
    }
    if (result.visualChanges) {
      visualChanges.push(...result.visualChanges);
    }
    clearHistory = clearHistory || Boolean(result.clearHistory);
  });

  const environment = {
    ...runtime.environment,
    PWD: runtime.currentDirectory,
    '?': String(lastExitCode),
  };

  return {
    output: outputs.join('\n'),
    success: lastExitCode === 0,
    exitCode: lastExitCode,
    newRepo: runtime.repo,
    currentDirectory: runtime.currentDirectory,
    environment,
    aliases: runtime.aliases,
    fileSystem: runtime.fileSystem,
    ...(feedback.length > 0 ? { feedback: feedback.join('\n') } : {}),
    ...(visualChanges.length > 0 ? { visualChanges } : {}),
    ...(clearHistory ? { clearHistory: true } : {}),
  };
};

export const getTerminalCompletions = (prefix: string, state: TerminalState): string[] => {
  const tokens = tokenize(prefix);
  const current = tokens[tokens.length - 1] ?? '';
  const commandPosition = tokens.length <= 1;
  const commands = [...BASH_COMMANDS, ...Object.keys(state.aliases)];
  const files = [
    ...state.currentRepo.files.map((file) => file.name),
    ...state.fileSystem
      .filter((entry) => entry.path.startsWith(state.currentDirectory) && entry.path !== state.currentDirectory)
      .map((entry) => basename(entry.path)),
  ];
  const candidates = commandPosition ? commands : files;

  return [...new Set(candidates)]
    .filter((candidate) => candidate.startsWith(current))
    .sort((left, right) => left.localeCompare(right));
};

export const formatDirectoryForPrompt = (state: TerminalState): string =>
  displayPath(state.currentDirectory, {
    repo: state.currentRepo,
    currentDirectory: state.currentDirectory,
    environment: state.environment,
    aliases: state.aliases,
    fileSystem: state.fileSystem,
    history: [],
    gitSimulator: new GitSimulator(),
  });
