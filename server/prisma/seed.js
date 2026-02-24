import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.submission.deleteMany();
  await prisma.task.deleteMany();
  await prisma.testQuestion.deleteMany();
  await prisma.question.deleteMany();
  await prisma.vacancy.deleteMany();

  console.log('Seed басталды...');

  await prisma.vacancy.create({
    data: {
      id: "vac-frontend-junior-1",
      company: "Kaspi Tech",
      title: "Junior Frontend Developer (Vue)",
      level: "junior",
      location: "Almaty",
      employment: "full-time",
      salaryRange: "450 000 - 650 000 KZT",
      tags: ["Vue 3", "TypeScript", "REST API"],
      summary: "Разработка пользовательских интерфейсов, участие в доработке внутренних продуктов.",
      questions: {
        create: [
          { question: "В чем отличие ref и reactive в Vue 3?", answer: "ref для примитивов, reactive для объектов." }
        ]
      },
      tests: {
        create: [
          { question: "Какой хук вызывается после монтирования?", options: ["onMounted", "onCreated"], correctAnswerIndex: 0 }
        ]
      },
      realTasks: {
        create: [
          { 
            id: "task-fe-1",
            title: "Форма регистрации", 
            brief: "Реализуйте форму с валидацией.", 
            requirements: ["Vue 3", "TS"], 
            deliverables: ["GitHub link"], 
            estimatedHours: 6 
          }
        ]
      }
    }
  });

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