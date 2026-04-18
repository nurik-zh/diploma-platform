import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const fetchAndSaveHHVacancies = async () => {
  try {
    console.log("⏳ HH-тан IT вакансияларын іздеу басталды...");

    // HeadHunter массивтерді дұрыс оқуы үшін URL-ді тікелей жазамыз
    // 96-Программист, 160-Тестировщик, 114-Аналитик, 124-Мобильный
    const hhUrl = 'https://api.hh.ru/vacancies?area=160&per_page=5&order_by=publication_time&text=Developer+OR+Разработчик+OR+Frontend+OR+Backend+OR+Mobile+OR+QA&professional_role=96&professional_role=160&professional_role=114&professional_role=124';

    const response = await axios.get(hhUrl, {
      headers: {
        'User-Agent': 'SkillloApp/1.0 (contact@skilllo.kz)'
      }
    });

    const hhVacancies = response.data.items;

    if (!hhVacancies || hhVacancies.length === 0) {
        console.log("⚠️ HH-тан ешқандай вакансия табылмады. URL немесе параметрлерді тексеріңіз.");
        return;
    }

    for (const item of hhVacancies) {
      // Вакансияның ішіндегі "Skills" (тегтер) алу үшін
      const detailRes = await axios.get(`https://api.hh.ru/vacancies/${item.id}`, {
        headers: { 'User-Agent': 'SkillloApp/1.0 (contact@skilllo.kz)' }
      });
      const detail = detailRes.data;

      // Level анықтау
      let expLevel = "middle";
      const hhExp = item.experience?.id;
      if (hhExp === 'noExperience') expLevel = "junior";
      else if (hhExp === 'moreThan6' || hhExp === 'between3And6') expLevel = "senior";

      // Тегтер
      let skills = detail.key_skills?.map((s: any) => s.name) || [];
      if (skills.length === 0) skills = ["IT", "Development"];

      // Базаға сақтау
      await prisma.vacancy.upsert({
        where: { id: item.id.toString() },
        update: {
          title: item.name,
          company: item.employer?.name || "IT Company",
          level: expLevel,
          location: item.area?.name || "Алматы",
          employment: item.employment?.name || "Полная занятость",
          salaryRange: item.salary 
            ? `${item.salary.from || ''} ${item.salary.to ? '- ' + item.salary.to : ''} ${item.salary.currency}`.trim()
            : "По договоренности",
          tags: skills.slice(0, 5),
          summary: detail.description.replace(/<[^>]*>?/gm, '').slice(0, 300) + "...",
        },
        create: {
          id: item.id.toString(),
          title: item.name,
          company: item.employer?.name || "IT Company",
          level: expLevel,
          location: item.area?.name || "Алматы",
          employment: item.employment?.name || "Полная занятость",
          salaryRange: item.salary 
            ? `${item.salary.from || ''} ${item.salary.to ? '- ' + item.salary.to : ''} ${item.salary.currency}`.trim()
            : "По договоренности",
          tags: skills.slice(0, 5),
          summary: detail.description.replace(/<[^>]*>?/gm, '').slice(0, 300) + "...",
        }
      });
      
      console.log(`➕ Сақталды: ${item.name} (${item.employer?.name})`);
    }

    console.log(`✅ Барлығы ${hhVacancies.length} нақты IT вакансия сақталды!`);
  } catch (error) {
    console.error("❌ HH-тан IT вакансияларын алу қатесі:", error);
  }
};