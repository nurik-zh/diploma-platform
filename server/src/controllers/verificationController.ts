import { Response } from 'express';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

// Слоттардың даталарын 7 күнге генерациялау (Фронтендтегі логиканы бэкендке көшірдік)
const getUpcomingDates = (days: number): string[] => {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + index);
    return date.toISOString().slice(0, 10);
  });
};

export const getSlots = async (req: any, res: Response) => {
  const dates = getUpcomingDates(7);
  const onlineTimes = ["10:00", "12:00", "15:30", "18:00"];
  const offlineTimes = ["11:00", "14:00", "16:30"];
  const onlineAssessors = ["Aigerim B.", "Maksat T.", "Dias N."];
  const offlineAssessors = ["Nurlybek K.", "Aruzhan S."];
  const offlineLocations = ["Almaty Hub, офис 3.2", "Astana Campus, зал B", "Shymkent Center, аудитория 12"];

  const slots: any[] = [];

  dates.forEach((date, dateIndex) => {
    onlineTimes.forEach((time, timeIndex) => {
      const seats = (dateIndex + timeIndex + 1) % 5 === 0 ? 0 : 1;
      slots.push({
        id: `${date}-online-${time}`,
        date, time, mode: "online", location: "Google Meet",
        assessor: onlineAssessors[(dateIndex + timeIndex) % onlineAssessors.length],
        seats
      });
    });

    offlineTimes.forEach((time, timeIndex) => {
      const seats = (dateIndex + timeIndex + 2) % 4 === 0 ? 0 : 1;
      slots.push({
        id: `${date}-offline-${time}`,
        date, time, mode: "offline",
        location: offlineLocations[(dateIndex + timeIndex) % offlineLocations.length],
        assessor: offlineAssessors[(dateIndex + timeIndex) % offlineAssessors.length],
        seats
      });
    });
  });

  res.json(slots);
};

export const getBookings = async (req: any, res: Response) => {
  const userId = req.user.userId;
  const bookings = await prisma.verificationBooking.findMany({
    where: { userId },
    orderBy: { bookedAt: 'desc' }
  });
  res.json(bookings);
};

export const createBooking = async (req: any, res: Response) => {
  const userId = req.user.userId;
  const data = req.body;
  
  const newBooking = await prisma.verificationBooking.create({
    data: {
      userId,
      slotId: data.slotId,
      roadmapId: data.roadmapId,
      roadmapTitle: data.roadmapTitle,
      mode: data.mode,
      date: data.date,
      time: data.time,
      dateTimeIso: data.dateTimeIso,
      location: data.location,
      assessor: data.assessor,
      status: "scheduled"
    }
  });

  res.status(201).json(newBooking);
};

export const completeBooking = async (req: any, res: Response) => {
  const userId = req.user.userId;
  const { id } = req.params;

  // Сертификат ID-сін бэкендте генерациялаймыз
  const certificateId = `SV-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  const updated = await prisma.verificationBooking.update({
    where: { id, userId },
    data: { status: "completed", completedAt: new Date(), certificateId }
  });

  res.json(updated);
};

export const cancelBooking = async (req: any, res: Response) => {
  const userId = req.user.userId;
  const { id } = req.params;

  await prisma.verificationBooking.delete({ where: { id, userId } });
  res.json({ success: true });
};