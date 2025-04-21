// Fun name generator for planning products, overcoming challenges, and having fun in the office

// Arrays of words for different parts of the name
const adjectives = [
  "Agile",
  "Innovative",
  "Dynamic",
  "Strategic",
  "Creative",
  "Collaborative",
  "Resilient",
  "Adaptive",
  "Visionary",
  "Proactive",
  "Energetic",
  "Transformative",
  "Efficient",
  "Flexible",
  "Resourceful",
  "Brilliant",
  "Empowered",
  "Synergistic",
  "Harmonious",
  "Pioneering",
]

const activities = [
  "Planning",
  "Brainstorming",
  "Designing",
  "Developing",
  "Strategizing",
  "Innovating",
  "Creating",
  "Building",
  "Transforming",
  "Revolutionizing",
  "Reimagining",
  "Crafting",
  "Engineering",
  "Architecting",
  "Constructing",
  "Launching",
  "Deploying",
  "Implementing",
]

const objects = [
  "Roadmap",
  "Sprint",
  "Project",
  "Product",
  "Solution",
  "Framework",
  "System",
  "Platform",
  "Initiative",
  "Strategy",
  "Vision",
  "Workflow",
  "Process",
  "Experience",
  "Interface",
  "Application",
  "Service",
  "Ecosystem",
  "Infrastructure",
  "Prototype",
]

const challenges = [
  "Challenges",
  "Obstacles",
  "Hurdles",
  "Bottlenecks",
  "Blockers",
  "Constraints",
  "Limitations",
  "Barriers",
  "Complexities",
  "Difficulties",
  "Problems",
  "Issues",
  "Roadblocks",
  "Setbacks",
]

const outcomes = [
  "Success",
  "Victory",
  "Achievement",
  "Breakthrough",
  "Milestone",
  "Accomplishment",
  "Triumph",
  "Progress",
  "Advancement",
  "Innovation",
  "Improvement",
  "Enhancement",
  "Optimization",
  "Growth",
]

const funElements = [
  "Laughter",
  "Celebration",
  "Joy",
  "Excitement",
  "Energy",
  "Enthusiasm",
  "Creativity",
  "Inspiration",
  "Collaboration",
  "Teamwork",
  "Harmony",
  "Synergy",
  "Camaraderie",
  "Spirit",
]

const officeItems = [
  "Whiteboard",
  "Coffee",
  "Sticky Notes",
  "Meeting Room",
  "Desk",
  "Chair",
  "Monitor",
  "Keyboard",
  "Mouse",
  "Notebook",
  "Pen",
  "Marker",
  "Calendar",
  "Laptop",
  "Headphones",
]

/**
 * Generates a fun name for planning sessions
 * @returns A fun name for the planning session
 */
export function generatePlanningName(): string {
  const templates = [
    `The ${getRandomItem(adjectives)} ${getRandomItem(activities)} ${getRandomItem(objects)}`,
    `${getRandomItem(adjectives)} ${getRandomItem(objects)} ${getRandomItem(activities)}`,
    `${getRandomItem(activities)} ${getRandomItem(adjectives)} ${getRandomItem(objects)}`,
    `${getRandomItem(adjectives)} ${getRandomItem(objects)} with ${getRandomItem(funElements)}`,
  ]

  return getRandomItem(templates)
}

/**
 * Generates a fun name for overcoming challenges
 * @returns A fun name for overcoming challenges
 */
export function generateChallengesName(): string {
  const templates = [
    `Conquering ${getRandomItem(adjectives)} ${getRandomItem(challenges)}`,
    `Overcoming ${getRandomItem(challenges)} for ${getRandomItem(outcomes)}`,
    `From ${getRandomItem(challenges)} to ${getRandomItem(outcomes)}`,
    `${getRandomItem(adjectives)} Solutions to ${getRandomItem(challenges)}`,
  ]

  return getRandomItem(templates)
}

/**
 * Generates a fun name for office activities
 * @returns A fun name for office activities
 */
export function generateOfficeFunName(): string {
  const templates = [
    `${getRandomItem(funElements)} with ${getRandomItem(officeItems)}`,
    `${getRandomItem(adjectives)} ${getRandomItem(officeItems)} ${getRandomItem(funElements)}`,
    `Office ${getRandomItem(funElements)} and ${getRandomItem(activities)}`,
    `${getRandomItem(adjectives)} Team ${getRandomItem(funElements)}`,
  ]

  return getRandomItem(templates)
}

/**
 * Generates a random fun name from all categories
 * @returns A random fun name
 */
export function generateRandomFunName(): string {
  const generators = [generatePlanningName, generateChallengesName, generateOfficeFunName]

  const generator = getRandomItem(generators)
  return generator()
}

/**
 * Gets a random item from an array
 * @param array The array to get a random item from
 * @returns A random item from the array
 */
function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}
