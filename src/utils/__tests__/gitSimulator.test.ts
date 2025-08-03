import { describe, it, expect, beforeEach } from 'vitest';
import { GitSimulator } from '../gitSimulator';
import { GitRepository } from '../../types/game';

describe('GitSimulator', () => {
  let gitSimulator: GitSimulator;
  let emptyRepo: GitRepository;

  beforeEach(() => {
    gitSimulator = new GitSimulator();
    emptyRepo = {
      initialized: false,
      files: [],
      branches: [],
      currentBranch: '',
      commits: [],
      config: {},
      workingDirectory: '/timeline-project',
    };
  });

  describe('executeCommand', () => {
    it('should handle git init command', () => {
      const result = gitSimulator.executeCommand('git', ['init'], emptyRepo);
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('Initialized empty Git repository');
      expect(result.newRepo?.initialized).toBe(true);
    });

    it('should handle git config commands', () => {
      const initializedRepo = { ...emptyRepo, initialized: true };
      
      const nameResult = gitSimulator.executeCommand('git', ['config', '--global', 'user.name', 'Test User'], initializedRepo);
      expect(nameResult.success).toBe(true);
      
      const emailResult = gitSimulator.executeCommand('git', ['config', '--global', 'user.email', 'test@example.com'], nameResult.newRepo!);
      expect(emailResult.success).toBe(true);
      expect(emailResult.newRepo?.config.userName).toBe('Test User');
      expect(emailResult.newRepo?.config.userEmail).toBe('test@example.com');
    });

    it('should handle git status command', () => {
      const initializedRepo = { ...emptyRepo, initialized: true, currentBranch: 'main' };
      
      const result = gitSimulator.executeCommand('git', ['status'], initializedRepo);
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('On branch main');
    });

    it('should handle git add command', () => {
      const initializedRepo = { ...emptyRepo, initialized: true };
      
      const result = gitSimulator.executeCommand('git', ['add', 'test.txt'], initializedRepo);
      
      expect(result.success).toBe(true);
      expect(result.newRepo?.files).toHaveLength(1);
      expect(result.newRepo?.files[0].name).toBe('test.txt');
      expect(result.newRepo?.files[0].staged).toBe(true);
    });

    it('should handle git commit command', () => {
      const repoWithConfig = {
        ...emptyRepo,
        initialized: true,
        currentBranch: 'main',
        config: { userName: 'Test User', userEmail: 'test@example.com' },
        files: [{ name: 'test.txt', content: 'test', staged: true, modified: false }],
      };
      
      const result = gitSimulator.executeCommand('git', ['commit', '-m', 'Initial commit'], repoWithConfig);
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('Initial commit');
      expect(result.newRepo?.commits).toHaveLength(1);
    });

    it('should handle shell commands', () => {
      const result = gitSimulator.executeCommand('ls', [], emptyRepo);
      expect(result.success).toBe(true);
      expect(result.output).toContain('No files found');
    });

    it('should handle help command', () => {
      const result = gitSimulator.executeCommand('help', [], emptyRepo);
      expect(result.success).toBe(true);
      expect(result.output).toContain('Available commands');
    });

    it('should handle unknown commands gracefully', () => {
      const result = gitSimulator.executeCommand('unknown', [], emptyRepo);
      expect(result.success).toBe(false);
      expect(result.output).toContain('Command not found');
    });
  });

  describe('command recognition', () => {
    it('should recognize git commands without git prefix', () => {
      const result = gitSimulator.executeCommand('init', [], emptyRepo);
      expect(result.success).toBe(true);
      expect(result.output).toContain('Initialized empty Git repository');
    });

    it('should handle malformed git commands', () => {
      const result = gitSimulator.executeCommand('gitinit', [], emptyRepo);
      expect(result.success).toBe(true);
      expect(result.output).toContain('Initialized empty Git repository');
    });
  });
}); 