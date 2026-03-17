import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// генерация вопросов
function generateQuestions(topicTitle) {
  return [
    {
      question: `What is ${topicTitle}?`,
      options: [
        "A concept used in software development",
        "A hardware device",
        "A type of database"
      ],
      correctIndex: 0
    },
    {
      question: `Why is ${topicTitle} important?`,
      options: [
        "It helps developers build better systems",
        "It deletes servers",
        "It replaces operating systems"
      ],
      correctIndex: 0
    },
    {
      question: `Which statement about ${topicTitle} is correct?`,
      options: [
        `${topicTitle} is widely used in modern development`,
        `${topicTitle} is only used in hardware`,
        `${topicTitle} cannot be used in programming`
      ],
      correctIndex: 0
    }
  ]
}

async function main() {

  console.log("🌱 Seed started")

  await prisma.topicQuestion.deleteMany()
  await prisma.roadmapNode.deleteMany()
  await prisma.roadmap.deleteMany()

  // -------------------------
  // ROADMAPS
  // -------------------------

  const roadmaps = [
    {
      id: "frontend",
      title: "Frontend Development",
      description: "React, Vue және заманауи интерфейстер",
      level: "Beginner"
    },
    {
      id: "backend",
      title: "Backend Development",
      description: "Node.js және API архитектурасы",
      level: "Intermediate"
    },
    {
      id: "devops",
      title: "DevOps Engineering",
      description: "CI/CD, Docker, Cloud",
      level: "Intermediate"
    },
    {
      id: "uiux",
      title: "UI / UX Design",
      description: "Figma, Research, Prototyping",
      level: "Beginner"
    },
    {
      id: "ai",
      title: "Artificial Intelligence",
      description: "ML, NLP, Computer Vision",
      level: "Beginner"
    }
  ]

  for (const r of roadmaps) {
    await prisma.roadmap.create({
      data: r
    })
  }

  console.log("✅ Roadmaps created")

  // -------------------------
  // TOPICS (RoadmapNodes)
  // -------------------------

  const nodes = [

    // FRONTEND
    { roadmapId: "frontend", title: "HTML Basics", orderIndex: 1, theory: "HTML structure and tags" },
    { roadmapId: "frontend", title: "CSS Fundamentals", orderIndex: 2, theory: "Selectors, Flexbox, Grid" },
    { roadmapId: "frontend", title: "Responsive Design", orderIndex: 3, theory: "Media queries" },
    { roadmapId: "frontend", title: "JavaScript Basics", orderIndex: 4, theory: "Variables, functions" },
    { roadmapId: "frontend", title: "JavaScript Advanced", orderIndex: 5, theory: "Closures, async/await" },
    { roadmapId: "frontend", title: "Vue.js Basics", orderIndex: 6, theory: "Components and reactivity" },
    { roadmapId: "frontend", title: "Vue Router", orderIndex: 7, theory: "SPA routing" },
    { roadmapId: "frontend", title: "State Management", orderIndex: 8, theory: "Pinia / Vuex" },

    // BACKEND
    { roadmapId: "backend", title: "Node.js Fundamentals", orderIndex: 1, theory: "Runtime environment" },
    { roadmapId: "backend", title: "Express.js Basics", orderIndex: 2, theory: "Routing and middleware" },
    { roadmapId: "backend", title: "REST API Design", orderIndex: 3, theory: "Endpoints and controllers" },
    { roadmapId: "backend", title: "Authentication", orderIndex: 4, theory: "JWT and sessions" },
    { roadmapId: "backend", title: "Database Basics", orderIndex: 5, theory: "SQL / NoSQL" },
    { roadmapId: "backend", title: "Prisma ORM", orderIndex: 6, theory: "Database models" },

    // DEVOPS
    { roadmapId: "devops", title: "Linux Basics", orderIndex: 1, theory: "CLI commands" },
    { roadmapId: "devops", title: "Docker Basics", orderIndex: 2, theory: "Containers" },
    { roadmapId: "devops", title: "Docker Compose", orderIndex: 3, theory: "Multi container apps" },
    { roadmapId: "devops", title: "CI/CD Fundamentals", orderIndex: 4, theory: "Automation pipelines" },
    { roadmapId: "devops", title: "Kubernetes Basics", orderIndex: 5, theory: "Container orchestration" },

    // UIUX
    { roadmapId: "uiux", title: "Design Fundamentals", orderIndex: 1, theory: "Color and typography" },
    { roadmapId: "uiux", title: "User Research", orderIndex: 2, theory: "Interviews and personas" },
    { roadmapId: "uiux", title: "Wireframing", orderIndex: 3, theory: "Low fidelity layouts" },
    { roadmapId: "uiux", title: "Figma Basics", orderIndex: 4, theory: "Frames and components" },
    { roadmapId: "uiux", title: "Prototyping", orderIndex: 5, theory: "Interactive prototypes" },

    // AI
    { roadmapId: "ai", title: "Python Basics", orderIndex: 1, theory: "Variables, loops, functions" },
    { roadmapId: "ai", title: "Math for ML", orderIndex: 2, theory: "Linear algebra and probability" },
    { roadmapId: "ai", title: "Data Analysis", orderIndex: 3, theory: "Pandas and NumPy" },
    { roadmapId: "ai", title: "Machine Learning Basics", orderIndex: 4, theory: "Supervised learning" },
    { roadmapId: "ai", title: "Deep Learning", orderIndex: 5, theory: "Neural networks" },
    { roadmapId: "ai", title: "Computer Vision", orderIndex: 6, theory: "Image recognition" }

  ]

  const createdNodes = []

  for (const node of nodes) {
    const created = await prisma.roadmapNode.create({
      data: node
    })
    createdNodes.push(created)
  }

  console.log("✅ Topics created")

  // -------------------------
  // QUESTIONS
  // -------------------------

  for (const node of createdNodes) {

    const questions = generateQuestions(node.title)

    await prisma.topicQuestion.createMany({
      data: questions.map(q => ({
        topicId: node.id,
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex
      }))
    })

  }

  console.log("✅ Questions generated")
  console.log("🌱 Seed finished")

}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })