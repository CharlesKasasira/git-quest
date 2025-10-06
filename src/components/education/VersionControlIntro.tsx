import React, { memo, useState, useCallback } from 'react';
import { 
  GitBranch, 
  Users, 
  History, 
  Shield, 
  Zap, 
  BookOpen, 
  Code, 
  Database,
  Globe,
  CheckCircle,
  ArrowRight,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';

interface VersionControlIntroProps {
  onComplete?: () => void;
  className?: string;
}

interface IntroSection {
  id: string;
  title: string;
  content: string;
  icon: React.ComponentType<any>;
  examples: string[];
  benefits: string[];
}

const VersionControlIntro: React.FC<VersionControlIntroProps> = memo(function VersionControlIntro({
  onComplete,
  className = ''
}) {
  const [currentSection, setCurrentSection] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const sections: IntroSection[] = [
    {
      id: 'what-is-version-control',
      title: 'What is Version Control?',
      content: 'Version control is a system that records changes to files over time, allowing you to recall specific versions later. Think of it as a "save game" system for your projects, but much more powerful.',
      icon: History,
      examples: [
        'Tracking changes in a software project',
        'Collaborating with team members',
        'Rolling back to previous versions',
        'Managing different features simultaneously'
      ],
      benefits: [
        'Never lose your work',
        'See what changed and when',
        'Work with others safely',
        'Experiment without fear'
      ]
    },
    {
      id: 'why-is-it-important',
      title: 'Why is Version Control Important?',
      content: 'Version control is essential for any serious development work. It provides safety, collaboration, and organization that you simply cannot achieve with manual file management.',
      icon: Shield,
      examples: [
        'Software development teams',
        'Academic research projects',
        'Content creation workflows',
        'Configuration management'
      ],
      benefits: [
        'Prevents data loss',
        'Enables team collaboration',
        'Provides project history',
        'Supports experimentation'
      ]
    },
    {
      id: 'common-use-cases',
      title: 'Common Use Cases',
      content: 'Version control is used in many different fields and scenarios. Understanding these use cases helps you see how version control applies to your work.',
      icon: Globe,
      examples: [
        'Software development and coding',
        'Documentation and writing',
        'Design and creative work',
        'Data science and research'
      ],
      benefits: [
        'Universal applicability',
        'Industry standard practice',
        'Professional development',
        'Career advancement'
      ]
    },
    {
      id: 'git-ecosystem',
      title: 'Git vs GitHub vs GitLab',
      content: 'Understanding the difference between Git, GitHub, and GitLab is crucial for navigating the version control ecosystem.',
      icon: Code,
      examples: [
        'Git: The version control system',
        'GitHub: Git hosting with social features',
        'GitLab: Git hosting with DevOps features',
        'Other platforms: Bitbucket, Azure DevOps'
      ],
      benefits: [
        'Choose the right tool',
        'Understand the ecosystem',
        'Navigate different platforms',
        'Make informed decisions'
      ]
    }
  ];

  const handleNext = useCallback(() => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(prev => prev + 1);
    } else {
      onComplete?.();
    }
  }, [currentSection, sections.length, onComplete]);

  const handlePrevious = useCallback(() => {
    if (currentSection > 0) {
      setCurrentSection(prev => prev - 1);
    }
  }, [currentSection]);

  const handleSectionClick = useCallback((index: number) => {
    setCurrentSection(index);
  }, []);

  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const currentSectionData = sections[currentSection];
  const Icon = currentSectionData.icon;

  return (
    <div className={`version-control-intro ${className}`}>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-pixel text-terminal-primary">Version Control Fundamentals</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={togglePlayPause}
              className="p-2 border border-terminal-primary text-terminal-primary rounded hover:bg-terminal-primary hover:text-black transition-all"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setCurrentSection(0)}
              className="p-2 border border-terminal-secondary text-terminal-secondary rounded hover:bg-terminal-secondary hover:text-black transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="text-terminal-secondary">
          Learn the fundamentals of version control and why it's essential for modern development
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-2">
          {sections.map((_, index) => (
            <button
              key={index}
              onClick={() => handleSectionClick(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentSection
                  ? 'bg-terminal-primary'
                  : index < currentSection
                  ? 'bg-terminal-secondary'
                  : 'bg-gray-600'
              }`}
            />
          ))}
        </div>
        <div className="text-xs text-terminal-secondary">
          Section {currentSection + 1} of {sections.length}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-black border border-terminal-primary rounded p-4">
            <h3 className="text-terminal-primary font-mono mb-3">Sections</h3>
            <div className="space-y-2">
              {sections.map((section, index) => (
                <button
                  key={section.id}
                  onClick={() => handleSectionClick(index)}
                  className={`w-full text-left p-2 rounded transition-all ${
                    index === currentSection
                      ? 'bg-terminal-primary bg-opacity-20 border border-terminal-primary'
                      : 'hover:bg-terminal-secondary hover:bg-opacity-10'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <section.icon className="w-4 h-4 text-terminal-secondary" />
                    <span className="text-sm text-terminal-text">{section.title}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section Content */}
        <div className="lg:col-span-2">
          <div className="bg-black border border-terminal-primary rounded p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Icon className="w-8 h-8 text-terminal-primary" />
              <h3 className="text-xl font-mono text-terminal-primary">{currentSectionData.title}</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-terminal-text leading-relaxed mb-4">
                {currentSectionData.content}
              </p>
            </div>

            {/* Examples */}
            <div className="mb-6">
              <h4 className="text-terminal-secondary font-mono mb-3">Examples</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentSectionData.examples.map((example, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <ArrowRight className="w-4 h-4 text-terminal-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-terminal-text">{example}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Benefits */}
            <div className="mb-6">
              <h4 className="text-terminal-secondary font-mono mb-3">Benefits</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentSectionData.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-terminal-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-terminal-text">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentSection === 0}
          className={`px-4 py-2 rounded border transition-all ${
            currentSection === 0
              ? 'border-gray-600 text-gray-600 cursor-not-allowed'
              : 'border-terminal-secondary text-terminal-secondary hover:bg-terminal-secondary hover:text-black'
          }`}
        >
          Previous
        </button>

        <div className="flex items-center space-x-4">
          <div className="text-sm text-terminal-secondary">
            {currentSection + 1} / {sections.length}
          </div>
        </div>

        <button
          onClick={handleNext}
          className="px-4 py-2 bg-terminal-primary text-black rounded border border-terminal-primary hover:bg-terminal-primary hover:bg-opacity-80 transition-all"
        >
          {currentSection === sections.length - 1 ? 'Complete' : 'Next'}
        </button>
      </div>

      {/* Quick Reference */}
      <div className="mt-6 p-4 bg-terminal-bg border border-terminal-primary rounded">
        <h4 className="text-terminal-primary font-mono mb-3">Quick Reference</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-terminal-secondary font-mono mb-2">Key Terms</div>
            <div className="space-y-1 text-terminal-text">
              <div>• <strong>Repository:</strong> Project storage</div>
              <div>• <strong>Commit:</strong> Save point</div>
              <div>• <strong>Branch:</strong> Parallel timeline</div>
              <div>• <strong>Merge:</strong> Combine changes</div>
            </div>
          </div>
          <div>
            <div className="text-terminal-secondary font-mono mb-2">Common Commands</div>
            <div className="space-y-1 text-terminal-text">
              <div>• <code className="text-terminal-primary">git init</code> - Start project</div>
              <div>• <code className="text-terminal-primary">git add</code> - Stage files</div>
              <div>• <code className="text-terminal-primary">git commit</code> - Save changes</div>
              <div>• <code className="text-terminal-primary">git push</code> - Upload changes</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default VersionControlIntro;
