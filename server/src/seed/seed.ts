import bcrypt from 'bcryptjs';
import { store } from '../data/store.js';
import { verifyListing } from '../domain/verifier.js';
import { seedProfilesFor, DEMO_STUDENT_EMAIL } from './demoData.js';

/**
 * Seeds demo accounts + sample job listings so the app is immediately
 * explorable. Idempotent: skips if demo users already exist.
 */
export async function seed(): Promise<void> {
  const existing = store.findUserByEmail('aarav@student.dev');
  if (existing) {
    console.log('[seed] Demo data already present — skipping');
    return;
  }

  console.log('[seed] Creating demo accounts...');
  const student = store.createUser({
    name: 'Aarav Sharma',
    email: 'aarav@student.dev',
    passwordHash: bcrypt.hashSync('password123', 10),
    role: 'student',
  });
  const recruiter = store.createUser({
    name: 'Priya Nair',
    email: 'priya@zencart.dev',
    passwordHash: bcrypt.hashSync('password123', 10),
    role: 'recruiter',
    companyName: 'Zencart Technologies',
  });
  store.createUser({
    name: 'SkillPath Admin',
    email: 'admin@skillpath.dev',
    passwordHash: bcrypt.hashSync('password123', 10),
    role: 'admin',
  });

  // Rich demo student profile
  const profile = seedProfilesFor(student.id);
  store.saveProfile(student.id, profile);

  // Recruiter's company + a couple of posted jobs
  const zencartJobs: Array<Parameters<typeof store.createJob>[0]> = [
    {
      title: 'Frontend Developer Intern',
      company: 'Zencart Technologies',
      companyId: null,
      postedBy: recruiter.id,
      location: 'Bengaluru, Karnataka',
      workType: 'internship',
      remote: 'hybrid',
      stipendMin: 25000,
      stipendMax: 35000,
      requiredSkills: ['React', 'JavaScript', 'Git'],
      preferredSkills: ['TypeScript', 'REST APIs', 'Tailwind CSS'],
      experienceReq: 'Fresher',
      minExperienceMonths: 0,
      educationReq: 'B.Tech/B.E. (CS/IT or related), 2025/2026 batch',
      minCGPA: 6.5,
      deadline: futureDate(21),
      description:
        `Zencart Technologies is building a B2B commerce platform used by 400+ retailers across India. ` +
        `As a Frontend Developer Intern you will: build and maintain React components for our merchant dashboard; ` +
        `consume REST APIs and handle loading/error states gracefully; write clean, tested code reviewed by senior engineers. ` +
        `Requirements: strong JavaScript fundamentals, React (personal or academic projects welcome), Git workflow. ` +
        `Nice to have: TypeScript, Tailwind CSS. Responsibilities include participating in weekly sprint planning. ` +
        `Apply with your resume and GitHub profile at careers@zencart.example. We never charge any fee at any stage.`,
      source: 'platform',
    },
    {
      title: 'Full Stack Developer (Fresher)',
      company: 'Zencart Technologies',
      companyId: null,
      postedBy: recruiter.id,
      location: 'Remote (India)',
      workType: 'job',
      remote: 'remote',
      stipendMin: null,
      stipendMax: null,
      salaryMinLpa: 6,
      salaryMaxLpa: 9,
      requiredSkills: ['Node.js', 'Express', 'React', 'SQL', 'REST APIs'],
      preferredSkills: ['TypeScript', 'Docker', 'MongoDB'],
      experienceReq: '0-1 years',
      minExperienceMonths: 0,
      educationReq: 'Any graduate, CS preferred',
      minCGPA: null,
      deadline: futureDate(30),
      description:
        `Join Zencart's platform team building merchant-facing APIs and internal tools. ` +
        `You will design REST endpoints in Node.js/Express, write SQL migrations, and ship React features. ` +
        `Requirements: Node.js, Express, SQL (we use PostgreSQL), REST API design, Git. Preferred: TypeScript, Docker, MongoDB. ` +
        `Requirements include participating in code reviews and writing tests. ` +
        `This is a full-time role with mentorship for freshers. Apply at careers@zencart.example.`,
      source: 'platform',
    },
  ];

  for (const j of zencartJobs) {
    const job = store.createJob(j);
    const v = verifyListing(job);
    store.updateJobVerification(job.id, v.status, v.reason);
    job.verificationSignals = v.signals;
  }

  // ---- Sample marketplace listings (realistic Indian postings) ----
  const sampleJobs: Array<Parameters<typeof store.createJob>[0]> = [
    {
      title: 'React Native Developer Intern',
      company: 'Flipkart',
      location: 'Bengaluru, Karnataka',
      workType: 'internship',
      remote: 'onsite',
      stipendMin: 40000,
      stipendMax: 50000,
      requiredSkills: ['React Native', 'JavaScript', 'Git'],
      preferredSkills: ['TypeScript', 'Redux'],
      experienceReq: 'Fresher',
      minExperienceMonths: 0,
      educationReq: 'B.Tech/B.E. 2026 batch',
      minCGPA: 7,
      deadline: futureDate(14),
      description:
        `Work with Flipkart's customer-experience team on features used by millions of shoppers. ` +
        `Requirements: React Native, JavaScript, Git. Responsibilities: build reusable components, debug performance issues, ` +
        `participate in weekly demos. Preferred: TypeScript, Redux. Requirements also include basic understanding of mobile UI patterns. ` +
        `Apply via Flipkart careers portal.`,
      source: 'sample',
    },
    {
      title: 'Backend Engineer Intern (Node.js)',
      company: 'Zerodha',
      location: 'Bengaluru, Karnataka',
      workType: 'internship',
      remote: 'onsite',
      stipendMin: 30000,
      stipendMax: 40000,
      requiredSkills: ['Node.js', 'Express', 'SQL', 'REST APIs'],
      preferredSkills: ['Docker', 'Redis'],
      experienceReq: 'Fresher',
      minExperienceMonths: 0,
      educationReq: 'B.Tech/B.E./MCA',
      minCGPA: 7.5,
      deadline: futureDate(25),
      description:
        `Zerodha's platform team builds low-latency trading infrastructure. ` +
        `As a backend intern you will build REST APIs in Node.js/Express, write SQL queries against PostgreSQL, ` +
        `and learn about queues and caching. Requirements: Node.js, Express, SQL, REST APIs, Git. ` +
        `Preferred: Docker, Redis. Responsibilities include writing tests and on-call shadowing. ` +
        `Apply through Zerodha's careers page.`,
      source: 'sample',
    },
    {
      title: 'Data Analyst Intern',
      company: 'Swiggy',
      location: 'Remote (India)',
      workType: 'internship',
      remote: 'remote',
      stipendMin: 20000,
      stipendMax: 25000,
      requiredSkills: ['SQL', 'Python', 'pandas'],
      preferredSkills: ['Power BI', 'statistics'],
      experienceReq: 'Fresher',
      minExperienceMonths: 0,
      educationReq: 'Any degree, quantitative background preferred',
      minCGPA: 6,
      deadline: futureDate(18),
      description:
        `Join Swiggy's analytics team to build dashboards used by category managers. ` +
        `Requirements: advanced SQL, Python with pandas, data cleaning. Responsibilities: own weekly metric reports, ` +
        `build Power BI dashboards, present insights. Preferred: statistics, experimentation basics. ` +
        `This internship requires strong SQL and communication skills. Apply on Swiggy careers.`,
      source: 'sample',
    },
    {
      title: 'Frontend Developer Intern',
      company: 'Razorpay',
      location: 'Bengaluru, Karnataka',
      workType: 'internship',
      remote: 'hybrid',
      stipendMin: 35000,
      stipendMax: 45000,
      requiredSkills: ['JavaScript', 'React', 'HTML', 'CSS'],
      preferredSkills: ['TypeScript', 'REST APIs', 'testing'],
      experienceReq: 'Fresher',
      minExperienceMonths: 0,
      educationReq: 'B.Tech/B.E. 2026 batch',
      minCGPA: 7,
      deadline: futureDate(20),
      description:
        `Razorpay's web team builds merchant dashboards handling crores in payments daily. ` +
        `Requirements: JavaScript, React, HTML, CSS, Git. Responsibilities: ship UI features, write unit tests, ` +
        `optimize rendering performance. Preferred: TypeScript, REST APIs, testing with Jest. ` +
        `Apply with GitHub profile on Razorpay careers portal.`,
      source: 'sample',
    },
    {
      title: 'Software Development Intern',
      company: 'Microsoft IDC',
      location: 'Hyderabad, Telangana',
      workType: 'internship',
      remote: 'onsite',
      stipendMin: 75000,
      stipendMax: 85000,
      requiredSkills: ['Data Structures & Algorithms', 'C++', 'problem solving'],
      preferredSkills: ['Java', 'Python', 'system design'],
      experienceReq: 'Fresher',
      minExperienceMonths: 0,
      educationReq: 'B.Tech/B.E./M.Tech (CS or related), pre-final year',
      minCGPA: 8,
      deadline: futureDate(40),
      description:
        `Microsoft India Development Center hires SDE interns through campus and off-campus drives. ` +
        `Requirements: strong DSA (data structures & algorithms), C++ or Java or Python, problem solving. ` +
        `Responsibilities: work with a mentor team on product features, participate in code reviews. ` +
        `Preferred: system design basics, OOP concepts. Apply via Microsoft careers. Selection involves online assessment and interviews focused on DSA.`,
      source: 'sample',
    },
    {
      title: 'ML Intern',
      company: 'Freshworks',
      location: 'Chennai, Tamil Nadu',
      workType: 'internship',
      remote: 'hybrid',
      stipendMin: 25000,
      stipendMax: 30000,
      requiredSkills: ['Python', 'Machine Learning', 'pandas'],
      preferredSkills: ['Docker', 'SQL', 'deep learning'],
      experienceReq: 'Fresher',
      minExperienceMonths: 0,
      educationReq: 'B.Tech/M.Tech/MSc (CS/Data Science)',
      minCGPA: 7,
      deadline: futureDate(28),
      description:
        `Freshworks AI team builds ML features for CRM products ( Freddy AI ). ` +
        `Requirements: Python, machine learning fundamentals, pandas, scikit-learn. Responsibilities: ` +
        `experiment with models, build evaluation pipelines, deploy small services. Preferred: Docker, SQL, deep learning basics. ` +
        `Apply on Freshworks careers portal.`,
      source: 'sample',
    },
    {
      title: 'Data Entry & Telecaller — Earn ₹5,000/day from home, no skills needed!',
      company: 'QuickHire Jobs',
      location: 'Remote (India)',
      workType: 'job',
      remote: 'remote',
      stipendMin: 150000,
      stipendMax: 150000,
      requiredSkills: [],
      preferredSkills: [],
      experienceReq: 'None',
      minExperienceMonths: 0,
      educationReq: 'None',
      minCGPA: null,
      deadline: futureDate(5),
      description:
        `URGENT HIRING! Earn ₹5,000 per day working 2 hours from home. No skills needed, no interview. ` +
        `Pay ₹999 registration fee to start. Send resume on WhatsApp only. Limited slots!`,
      source: 'sample',
    },
    {
      title: 'Java Backend Developer (0-2 years)',
      company: 'TCS Digital',
      location: 'Pune, Maharashtra',
      workType: 'job',
      remote: 'onsite',
      stipendMin: null,
      stipendMax: null,
      salaryMinLpa: 7,
      salaryMaxLpa: 9,
      requiredSkills: ['Java', 'Spring Boot', 'SQL', 'OOP'],
      preferredSkills: ['AWS', 'Docker', 'REST APIs'],
      experienceReq: '0-2 years',
      minExperienceMonths: 0,
      educationReq: 'B.Tech/B.E./MCA',
      minCGPA: 6,
      deadline: futureDate(35),
      description:
        `TCS Digital hires Java developers for enterprise projects across banking and retail clients. ` +
        `Requirements: Core Java, Spring Boot, SQL, OOP concepts. Responsibilities: build REST APIs with Spring Boot, ` +
        `write unit tests, participate in agile ceremonies. Preferred: AWS, Docker. Apply via TCS NextStep portal. ` +
        `Includes structured training and mentorship for freshers.`,
      source: 'sample',
    },
  ];

  for (const j of sampleJobs) {
    const job = store.createJob(j);
    const v = verifyListing(job);
    store.updateJobVerification(job.id, v.status, v.reason);
    job.verificationSignals = v.signals;
  }

  // Demo applications for the sample student
  const allJobs = store.listJobs();
  const zencartFrontend = allJobs.find((j) => j.company === 'Zencart Technologies' && j.workType === 'internship');
  const razorpay = allJobs.find((j) => j.company === 'Razorpay');
  const swiggy = allJobs.find((j) => j.company === 'Swiggy');

  if (zencartFrontend) {
    store.createApplication({
      userId: student.id,
      jobId: zencartFrontend.id,
      company: zencartFrontend.company,
      role: zencartFrontend.title,
      status: 'applied',
      appliedDate: daysAgo(4),
      deadline: zencartFrontend.deadline,
      interviewDate: null,
      notes: 'Applied via SkillPath. Followed up on LinkedIn with a recruiter.',
    });
  }
  if (razorpay) {
    store.createApplication({
      userId: student.id,
      jobId: razorpay.id,
      company: razorpay.company,
      role: razorpay.title,
      status: 'interview',
      appliedDate: daysAgo(12),
      deadline: razorpay.deadline,
      interviewDate: futureDate(3),
      notes: 'Round 1 cleared (JS + React). Round 2: machine coding — practice timer app.',
    });
  }
  if (swiggy) {
    store.createApplication({
      userId: student.id,
      jobId: swiggy.id,
      company: swiggy.company,
      role: swiggy.title,
      status: 'saved',
      appliedDate: null,
      deadline: swiggy.deadline,
      interviewDate: null,
      notes: 'Need to finish SQL joins practice before applying.',
    });
  }

  console.log('[seed] Done. Demo logins: aarav@student.dev / priya@zencart.dev / admin@skillpath.dev (password: password123)');
  console.log(`[seed] Demo student: ${DEMO_STUDENT_EMAIL}`);
}

function futureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
