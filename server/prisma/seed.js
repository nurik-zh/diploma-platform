import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.submission.deleteMany();
  await prisma.task.deleteMany();
  await prisma.testQuestion.deleteMany();
  await prisma.question.deleteMany();
  await prisma.vacancy.deleteMany();
  await prisma.roadmapNode.deleteMany();
await prisma.roadmap.deleteMany();

  console.log('Seed басталды...');

  await prisma.roadmap.create({
  data: {
    id: "frontend",
    title: "Frontend Development",
    description: "React, Vue және заманауи интерфейстер",
    level: "Beginner",
    recommended: true,
    nodes: {
      create: [
        { title: "HTML Basics", orderIndex: 1, theory: "HTML құрылымы" },
        { title: "CSS Fundamentals", orderIndex: 2, theory: "Selectors, Flexbox, Grid" },
        { title: "Responsive Design", orderIndex: 3, theory: "Media queries" },
        { title: "JavaScript Basics", orderIndex: 4, theory: "Variables, functions" },
        { title: "JavaScript Advanced", orderIndex: 5, theory: "Closures, async/await" },
        { title: "DOM Manipulation", orderIndex: 6, theory: "Document Object Model" },
        { title: "HTTP & REST API", orderIndex: 7, theory: "Fetch, axios" },
        { title: "Vue.js Basics", orderIndex: 8, theory: "Components, reactive" },
        { title: "Vue Router", orderIndex: 9, theory: "SPA routing" },
        { title: "State Management", orderIndex: 10, theory: "Pinia / Vuex" },
        { title: "Testing", orderIndex: 11, theory: "Unit tests" },
        { title: "Deployment", orderIndex: 12, theory: "Vercel / Docker" }
      ]
    }
  }
});
await prisma.roadmap.create({
  data: {
    id: "backend",
    title: "Backend Development",
    description: "Node.js және API архитектурасы",
    level: "Intermediate",
    recommended: true,
    nodes: {
      create: [
        { title: "Node.js Fundamentals", orderIndex: 1, theory: "Runtime environment" },
        { title: "Express.js Basics", orderIndex: 2, theory: "Routing & middleware" },
        { title: "REST API Design", orderIndex: 3, theory: "Endpoints" },
        { title: "Authentication", orderIndex: 4, theory: "JWT, sessions" },
        { title: "Database Basics", orderIndex: 5, theory: "SQL / NoSQL" },
        { title: "ORM / Prisma", orderIndex: 6, theory: "Database models" },
        { title: "Caching", orderIndex: 7, theory: "Redis basics" },
        { title: "Testing Backend", orderIndex: 8, theory: "Jest, supertest" },
        { title: "Security", orderIndex: 9, theory: "Helmet, CORS" },
        { title: "Deployment", orderIndex: 10, theory: "Docker, cloud" }
      ]
    }
  }
});
await prisma.roadmap.create({
  data: {
    id: "devops",
    title: "DevOps Engineering",
    description: "CI/CD, Docker, Cloud",
    level: "Intermediate",
    recommended: true,
    nodes: {
      create: [
        { title: "Linux Basics", orderIndex: 1, theory: "CLI commands" },
        { title: "Docker Basics", orderIndex: 2, theory: "Containers" },
        { title: "Docker Compose", orderIndex: 3, theory: "Multi container apps" },
        { title: "CI/CD Fundamentals", orderIndex: 4, theory: "Automation pipelines" },
        { title: "GitHub Actions", orderIndex: 5, theory: "CI automation" },
        { title: "Kubernetes Basics", orderIndex: 6, theory: "Container orchestration" },
        { title: "Monitoring", orderIndex: 7, theory: "Prometheus / Grafana" },
        { title: "Cloud Basics", orderIndex: 8, theory: "AWS / Azure" },
        { title: "Infrastructure as Code", orderIndex: 9, theory: "Terraform" },
        { title: "Security in DevOps", orderIndex: 10, theory: "DevSecOps" }
      ]
    }
  }
});
await prisma.roadmap.create({
  data: {
    id: "uiux",
    title: "UI / UX Design",
    description: "Figma, Research, Prototyping",
    level: "Beginner",
    recommended: true,
    nodes: {
      create: [
        {
          title: "Design Fundamentals",
          orderIndex: 1,
          theory: "Color theory, typography, layout basics"
        },
        {
          title: "User Experience Basics",
          orderIndex: 2,
          theory: "User journey, usability principles"
        },
        {
          title: "User Research",
          orderIndex: 3,
          theory: "Interviews, surveys, personas"
        },
        {
          title: "Wireframing",
          orderIndex: 4,
          theory: "Low fidelity layout design"
        },
        {
          title: "Figma Basics",
          orderIndex: 5,
          theory: "Frames, components, auto layout"
        },
        {
          title: "Prototyping",
          orderIndex: 6,
          theory: "Interactive prototypes"
        },
        {
          title: "Design Systems",
          orderIndex: 7,
          theory: "Reusable components"
        },
        {
          title: "Accessibility (A11y)",
          orderIndex: 8,
          theory: "Design for everyone"
        },
        {
          title: "UX Testing",
          orderIndex: 9,
          theory: "Usability testing"
        },
        {
          title: "Portfolio & Case Studies",
          orderIndex: 10,
          theory: "Showcasing design work"
        }
      ]
    }
  }
});
await prisma.roadmap.create({
  data: {
    id: "ai",
    title: "Artificial Intelligence",
    description: "ML, NLP, Computer Vision",
    level: "Beginner",
    recommended: true,
    nodes: {
      create: [
        {
          title: "Python Basics",
          orderIndex: 1,
          theory: "Variables, loops, functions"
        },
        {
          title: "Math for ML",
          orderIndex: 2,
          theory: "Linear algebra, probability"
        },
        {
          title: "Data Analysis",
          orderIndex: 3,
          theory: "Pandas, NumPy"
        },
        {
          title: "Machine Learning Basics",
          orderIndex: 4,
          theory: "Supervised vs unsupervised learning"
        },
        {
          title: "Scikit-learn",
          orderIndex: 5,
          theory: "ML models with sklearn"
        },
        {
          title: "Deep Learning",
          orderIndex: 6,
          theory: "Neural networks basics"
        },
        {
          title: "TensorFlow / PyTorch",
          orderIndex: 7,
          theory: "Building deep learning models"
        },
        {
          title: "Natural Language Processing",
          orderIndex: 8,
          theory: "Text processing"
        },
        {
          title: "Computer Vision",
          orderIndex: 9,
          theory: "Image recognition"
        },
        {
          title: "AI Deployment",
          orderIndex: 10,
          theory: "Serving ML models"
        }
      ]
    }
  }
});


  // await prisma.vacancy.create({
  //   data: {
  //     id: "vac-frontend-junior-1",
  //     company: "Kaspi Tech",
  //     title: "Junior UX/UI Developer (Vue)",
  //     level: "junior",
  //     location: "Almaty",
  //     employment: "full-time",
  //     salaryRange: "450 000 - 650 000 KZT",
  //     tags: ["Vue 3", "TypeScript", "REST API"],
  //     summary: "Разработка пользовательских интерфейсов, участие в доработке внутренних продуктов.",
  //     questions: {
  //       create: [
  //         { question: "В чем отличие ref и reactive в Vue 3?", answer: "ref для примитивов, reactive для объектов." }
  //       ]
  //     },
  //     tests: {
  //       create: [
  //         { question: "Какой хук вызывается после монтирования?", options: ["onMounted", "onCreated"], correctAnswerIndex: 0 }
  //       ]
  //     },
  //     realTasks: {
  //       create: [
  //         { 
  //           id: "task-fe-1",
  //           title: "Форма регистрации", 
  //           brief: "Реализуйте форму с валидацией.", 
  //           requirements: ["Vue 3", "TS"], 
  //           deliverables: ["GitHub link"], 
  //           estimatedHours: 6 
  //         }
  //       ]
  //     }
  //   }
  // });

  console.log('Roadmap-тарды енгізу...');




  console.log('Seed сәтті аяқталды! ✅');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });