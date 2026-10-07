import type { StudentProfile } from '../types.js';

export const DEMO_STUDENT_EMAIL = 'aarav@student.dev';

export function seedProfilesFor(userId: string): StudentProfile {
  return {
    userId,
    name: 'Aarav Sharma',
    college: 'VJTI Mumbai',
    degree: 'B.Tech',
    branch: 'Computer Engineering',
    gradYear: 2026,
    cgpa: 8.2,
    skills: [
      { name: 'javascript', level: 'advanced', source: 'manual' },
      { name: 'react', level: 'intermediate', source: 'manual' },
      { name: 'html', level: 'advanced', source: 'manual' },
      { name: 'css', level: 'intermediate', source: 'manual' },
      { name: 'git', level: 'intermediate', source: 'manual' },
      { name: 'sql', level: 'beginner', source: 'manual' },
      { name: 'cpp', level: 'intermediate', source: 'manual' },
      { name: 'dsa', level: 'beginner', source: 'manual' },
    ],
    certifications: [
      'Meta Front-End Developer (Coursera)',
      'freeCodeCamp JavaScript Algorithms and Data Structures',
    ],
    projects: [
      {
        title: 'College Event Portal',
        description: 'React SPA for fest registrations with admin panel; used by 1,200+ students.',
        techStack: ['React', 'JavaScript', 'Firebase'],
        link: 'github.com/aarav/event-portal',
      },
      {
        title: 'Portfolio Website',
        description: 'Responsive personal portfolio with blog, Lighthouse score 95+.',
        techStack: ['HTML', 'CSS', 'JavaScript'],
        link: 'aarav.dev',
      },
    ],
    github: 'github.com/aaravsharma',
    linkedin: 'linkedin.com/in/aaravsharma',
    targetRoleId: 'frontend_dev',
    preferredLocations: ['Bengaluru', 'Mumbai', 'Pune'],
    remotePref: 'any',
    resumeText: null,
    resumeParsed: null,
    updatedAt: new Date().toISOString(),
  };
}
