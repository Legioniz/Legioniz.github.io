export type ProjectCategory = 'Software' | 'Data & Systems' | 'Embedded' | 'Creative'

export type Project = {
  id: string
  number: string
  name: string
  shortName: string
  category: ProjectCategory
  label: string
  headline: string
  summary: string
  overview: string
  role: string
  stack: string[]
  highlights: string[]
  details: string[]
  status: string
  repo?: string
  featured: boolean
  visual: 'lens' | 'meter' | 'fan' | 'game' | 'toki'
}

export const projects: Project[] = [
  {
    id: 'lens-lab',
    number: '01',
    name: 'LENS LAB',
    shortName: 'LensLab',
    category: 'Software',
    label: 'Photography learning studio',
    headline: 'Make camera behavior easier to understand.',
    summary: 'An interactive, local-first photography learning and simulation studio for exploring camera settings, practicing exposure, analyzing images, and experimenting with editing workflows.',
    overview: 'LensLab turns photography concepts into an environment where learners can experiment. Its documented direction combines camera and lens profiles, image-based learning scenes, a Photo Lab for personal photographs, versioned text presets, a gallery, analysis tools, and an Academy experience.',
    role: 'Independent project — concept, implementation, interface design, and iterative testing.',
    stack: ['TypeScript', 'Vite', 'JavaScript', 'HTML / CSS', 'Local-first architecture'],
    highlights: ['Camera and lens profile exploration', 'Exposure practice and learning scenes', 'Photo Lab for personal images', 'Versioned text-based presets', 'Gallery, analysis, and Academy workflows'],
    details: [
      'The project is designed around experimentation: users can change settings, compare outcomes, and learn the relationship between photographic controls.',
      'The README documents a Windows launcher that checks the environment, reconciles dependencies when needed, runs checks and a build, then starts the local app.',
      'The published repository README identifies the project as LensLab 0.5.1. Portfolio wording describes documented capabilities and does not imply every planned idea is production-ready.',
    ],
    status: 'Local-first application',
    repo: 'https://github.com/Legioniz/LensLab',
    featured: true,
    visual: 'lens',
  },
  {
    id: 'smart-meter',
    number: '02',
    name: 'SMART ELECTRICAL MONITORING',
    shortName: 'Smart Electrical Monitoring',
    category: 'Data & Systems',
    label: 'Energy analytics demonstration',
    headline: 'Turn electricity readings into useful context.',
    summary: 'A local-only electrical-energy analytics demonstration that explores consumption patterns, usage anomalies, forecasts, and appliance estimates using synthetic electricity data.',
    overview: 'Smart Electrical Monitoring presents an energy-intelligence workflow: organize readings, visualize usage, surface unusual patterns, and make estimates easier to interpret. It is deliberately described as a synthetic-data demonstration, not as a live utility integration.',
    role: 'Independent project — system planning, implementation, interface work, and verification.',
    stack: ['Python', 'SQL / MySQL', 'Web interface', 'Analytics', 'Local-first design'],
    highlights: ['Consumption analytics and visualization', 'Usage anomaly exploration', 'Forecasting and uncertainty context', 'Appliance consumption estimates', 'Privacy-focused controls'],
    details: [
      'The public repository describes a local-only application that uses synthetic electricity readings.',
      'It is not connected to Meralco, a utility provider, a real smart meter, billing systems, outage systems, or external notification providers.',
      'That boundary is part of the project story: the interface and analytical workflow can be explored without implying access to real customer or utility data.',
    ],
    status: 'Synthetic-data demonstration',
    repo: 'https://github.com/Legioniz/Smart_Electrical_Monitoring_2.13',
    featured: true,
    visual: 'meter',
  },
  {
    id: 'fan-controller',
    number: '03',
    name: 'AUTOMATED FAN CONTROLLER',
    shortName: 'Fan Controller',
    category: 'Embedded',
    label: 'Arduino embedded system',
    headline: 'Connect sensor readings to physical behavior.',
    summary: 'An Arduino fan controller with LM35 temperature sensing, PWM speed regulation, majority-vote temperature sampling, startup kick control, debounced mode switching, and serial monitoring.',
    overview: 'This embedded project explores the path from sensor input to physical output. Temperature readings are used in the fan-control workflow, while manual mode and serial monitoring help make system behavior observable.',
    role: 'Embedded systems project — programmed a portable fan with automatic temperature sensing using C++ on Arduino.',
    stack: ['C++', 'Arduino', 'LM35 temperature sensor', 'PWM', 'Serial monitoring'],
    highlights: ['LM35 temperature sensing', 'PWM fan-speed regulation', 'Majority-vote sampling', 'Startup kick control', 'Debounced mode switching'],
    details: [
      'The public repository includes the Arduino sketch `fan_controller_v6.ino` and documents the main control behaviors.',
      'The project is a compact example of sensor-driven embedded logic, combining measurement, control, user mode switching, and monitoring.',
    ],
    status: 'Embedded prototype',
    repo: 'https://github.com/Legioniz/Automated-Fan-Controller-with-Manual-Control',
    featured: true,
    visual: 'fan',
  },
  {
    id: 'python-game-concepts',
    number: '04',
    name: 'PYTHON GAME CONCEPTS',
    shortName: 'Python Game Concepts',
    category: 'Software',
    label: 'Senior high school capstone',
    headline: 'Turn game ideas into working logic.',
    summary: 'A senior high school capstone project involving the design and development of three game concepts using Python.',
    overview: 'The capstone explored game development as a way to apply programming fundamentals. Three game concepts were designed and built in Python, providing a practical setting for experimenting with interaction, rules, and program flow.',
    role: 'Student capstone — designed and built three game concepts in Python.',
    stack: ['Python', 'Game logic', 'Problem solving'],
    highlights: ['Three game concepts designed and built', 'Applied Python programming fundamentals', 'Explored interaction and game rules', 'Academic capstone experience'],
    details: [
      'The resume documents three game concepts developed in Python as a senior high school capstone project.',
      'The individual game titles, screenshots, and source repository have not yet been provided, so this entry stays at the level supported by the documented experience.',
    ],
    status: 'Academic capstone',
    featured: false,
    visual: 'game',
  },
  {
    id: 'toki-satsuei',
    number: '05',
    name: 'TOKI SATSUEI',
    shortName: 'Toki Satsuei',
    category: 'Creative',
    label: 'Cosplay & portrait photography',
    headline: 'Capture moments. Preserve memories.',
    summary: 'A Quezon City-based photography initiative focused on cosplay, portraits, duo and group sessions, and event coverage.',
    overview: 'Toki Satsuei is a creative practice built around visual storytelling, thoughtful photo delivery, and clear art direction. It extends the portfolio beyond software through planning, communication, brand development, and image-making.',
    role: 'Co-leads a small creative team, with a focus on photography planning and editing.',
    stack: ['Canon EOS 3000D', 'Photography', 'Photo editing', 'Visual direction', 'Brand development'],
    highlights: ['Cosplay and character portraits', 'Individual, duo, and group sessions', 'Outdoor and event photography', 'Consistent visual identity', 'Client communication and delivery planning'],
    details: [
      'This is an early-stage creative venture, not a claim of a large commercial studio or advanced professional photography experience.',
      'The work builds on school-event photography experience and continued practice with a DSLR camera.',
    ],
    status: 'Creative practice',
    featured: false,
    visual: 'toki',
  },
]

export const skillGroups = [
  {
    name: 'Programming & development',
    note: 'Languages and web technologies applied in academic and independent projects.',
    items: ['Python', 'C++', 'Java', 'JavaScript', 'HTML', 'CSS', 'SQL'],
  },
  {
    name: 'Hardware, systems & support',
    note: 'Hands-on work across computer environments, electronics, devices, and connectivity.',
    items: ['Arduino', 'Sensor integration', 'Robotics', 'LM35', 'PWM control', 'MySQL', 'Git & GitHub', 'Computer troubleshooting', 'Hardware maintenance', 'Networking', 'Audio / speaker setup'],
  },
  {
    name: 'Design, media & production',
    note: 'Visual content, photography, video playback, livestreams, and event documentation.',
    items: ['Canva', 'PowerDirector', 'Event photography', 'Photo editing', 'Video editing', 'Visual playback', 'Esports livestream operations'],
  },
  {
    name: 'OSINT & cybersecurity foundations',
    note: 'Self-directed public-source research and foundational defensive practice in isolated, authorized lab environments.',
    items: ['Public-source OSINT', 'Personal & corporate legitimacy checks', 'Official-source verification', 'Linux fundamentals', 'Kali Linux exposure', 'Nmap host / port discovery', 'Local firewall rules and port blocking', 'Port and traffic analysis', 'Medusa authorized login-audit labs', 'Isolated dummy-machine labs', 'Data / traffic spoofing and IP-manipulation concepts (lab-based)'],
  },
  {
    name: 'Leadership & professional practice',
    note: 'Coordination, teaching, event planning, and collaborative delivery.',
    items: ['Student government', 'Team leadership', 'Event planning', 'Technical operations', 'Teaching', 'Communication', 'Documentation', 'Problem-solving'],
  },
]

export const experience = [
  {
    period: 'July 2026 — Present',
    title: 'Cook / Food Preparation & Beverage Staff',
    organization: 'Migoy’s Burger · Quezon City',
    description: 'Prepares burgers, hot dogs, footlongs, ham, spam, tonkatsu, nuggets, and fries, along with milk tea, iced coffee, and fruit tea. Maintains food safety and sanitation standards, manages ingredients and inventory, and keeps the workstation clean and efficient.',
    tags: ['Food preparation', 'Beverage service', 'Inventory & sanitation'],
  },
  {
    period: 'July 2026 — August 2026',
    title: 'Cook / Food Preparation Staff',
    organization: 'Best Choice Food Cart Corp. · Quezon City',
    description: 'Prepared takoyaki and fried noodles, organized ingredients, monitored inventory, and maintained cleanliness, food safety, and timely preparation.',
    tags: ['Food preparation', 'Inventory', 'Food safety'],
  },
  {
    period: 'March 2026 — August 2026',
    title: 'Event Organizer',
    organization: 'Freelance · Quezon City',
    description: 'Planned and coordinated school programs, community events, and private functions. Managed event logistics, vendor coordination, scheduling, and on-site operations while communicating with clients and team members.',
    tags: ['Event planning', 'Logistics', 'Vendor coordination'],
  },
  {
    period: 'February 2026 — March 2026',
    title: 'Student Teacher — Practical Research & Computer Programming',
    organization: 'On-the-Job Training · CASAP · Quezon City',
    description: 'Taught Computer Programming (HTML/CSS) and Practical Research to senior high school students. Prepared lesson materials, led hands-on coding sessions, and supported students with programming exercises and research activities.',
    tags: ['HTML / CSS instruction', 'Lesson planning', 'Practical Research'],
  },
  {
    period: 'May 2022 — April 2026',
    title: 'Computer Support Specialist',
    organization: 'Freelance / Project-based · Quezon City',
    description: 'Diagnosed hardware, software, and network issues; installed and configured operating systems, applications, and peripherals; set up home and office networks, routers, printers, and connected devices; and provided customer support.',
    tags: ['Computer troubleshooting', 'System setup', 'Networking'],
  },
  {
    period: 'November 2025 — December 2025',
    title: 'Assistant Electrician',
    organization: 'Freelance · Quezon City',
    description: 'Assisted with residential wiring, outlet installation, lighting fixtures, and maintenance. Supported licensed electricians during troubleshooting and issue resolution, and prepared tools and equipment.',
    tags: ['Residential electrical work', 'Installation assistance', 'Troubleshooting'],
  },
]

type EducationRecord = { period: string; school: string; level: string; note?: string }

export const education: EducationRecord[] = [
  { period: '2024 — 2026', school: 'College of Arts and Sciences of Asia and the Pacific', level: 'Senior High School · STEM Strand', note: 'Grade: 96' },
  { period: '2020 — 2024', school: 'Commonwealth High School', level: 'Junior High School · Science, Technology and Engineering (STE)' },
  { period: '2014 — 2020', school: 'Golden Lamp School', level: 'Elementary' },
]

type Achievement = { title: string; note: string; mark: string; href?: string; source?: string }

export const achievements: Achievement[] = [
  {
    title: 'Thailand International Mathematical Olympiad (TIMO)',
    note: 'Gold Award · 2025–2026 Heat Round · Senior Secondary Group · Candidate No. 1005463',
    mark: '01',
    href: 'https://www.olympiad-champion.com/uploads/2/8/9/2/28923219/timo_heat_round_2526_ss_hk.pdf',
    source: 'Published ranking',
  },
  {
    title: 'PUP Quezon City Hackathon',
    note: 'Winner — developed and presented an innovative software solution in a competitive team environment',
    mark: '02',
    source: 'Owner-reported achievement; event date, category, and project details not supplied',
  },
  {
    title: 'Quiz Bee & Spelling Competitions',
    note: 'Multiple-time competition winner',
    mark: '03',
    source: 'Supplied resume; individual contest names and years not specified',
  },
  {
    title: 'Best Paper Presenter',
    note: 'Applied Science',
    mark: '04',
    source: 'Supplied resume',
  },
  {
    title: 'Badminton Tournament',
    note: 'Second place',
    mark: '05',
    source: 'Supplied resume; event name and year not specified',
  },
  {
    title: 'Stop the Bleed',
    note: 'First Aid Certificate · Philippine Red Cross',
    mark: '06',
    source: 'Supplied resume',
  },
]

export const extracurriculars = [
  {
    title: 'SSG & SSLG',
    organization: 'Commonwealth High School',
    description: 'Participated in student-government activities and served in progressively responsible roles, from Grade Level Representative to Auditor and Public Information Officer (PIO).',
  },
  {
    title: 'Glee Club',
    organization: 'CASAP Quezon City',
    description: 'Was a member of the campus Glee Club and a bass guitarist in the school’s main band, which performed at the school’s Gala Night.',
  },
  {
    title: 'Technology Club & Technical Team',
    organization: 'School activities',
    description: 'Served as a Technology Club officer and Technical Team Leader. Managed visual and video playback, audio and speaker setup, and hardware and software troubleshooting for performances and school events. Also served as the primary technical operator for Mobile Legends: Bang Bang and Call of Duty: Mobile esports livestreams.',
  },
  {
    title: 'Mathematics Club & Science Club',
    organization: 'School activities',
    description: 'Served as an officer in both clubs, helping plan events and create their visual designs and materials.',
  },
  {
    title: 'Badminton Club & Volunteer Photographer',
    organization: 'CASAP Quezon City school activities',
    description: 'Played badminton and volunteered as an event photographer at CASAP QC activities, including social and sports events, pageants, quiz bees, officer portraits, and competitions. Photographed and edited images for school documentation and social media posts.',
  },
]
