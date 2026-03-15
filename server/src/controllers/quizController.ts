export const getQuiz = async (req, res) => {
  const { profession } = req.params;
  // Мұнда базадан немесе дайын файлдан сұрақтарды жібересіз
  const questions = [
    { id: 1, question: "React деген не?", options: ["Library", "Framework", "Language"], correct: "Library" },
    // ... көбірек сұрақтар
  ];
  res.json(questions);
};