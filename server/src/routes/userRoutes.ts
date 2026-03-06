import { Router } from "express";
import {
  getRoadmapProgress,
  getUserRoadmapCollection,
  getUserYearActivity,
  removeUserRoadmapFromCollection,
  updateUserRoadmapCollection,
} from "../controllers/userController.js";
import {
  addFriendByEmail,
  createFriendChallenge,
  getFriendChallenges,
  getFriendChallengeNotifications,
  getFriendSuggestions,
  getFriends,
  getGlobalItMap,
  markFriendChallengeNotificationRead,
  removeFriend,
} from "../controllers/socialController.js";

const router = Router();

router.get("/:userId/roadmaps", getUserRoadmapCollection);
router.put("/:userId/roadmaps", updateUserRoadmapCollection);
router.delete("/:userId/roadmaps/:roadmapId", removeUserRoadmapFromCollection);

router.get("/:userId/roadmap-progress", getRoadmapProgress);
router.get("/:userId/activity", getUserYearActivity);

router.get("/:userId/friends", getFriends);
router.get("/:userId/friends/suggestions", getFriendSuggestions);
router.post("/:userId/friends", addFriendByEmail);
router.delete("/:userId/friends/:friendUserId", removeFriend);

router.get("/:userId/global-it-map", getGlobalItMap);

router.get("/:userId/friend-challenges", getFriendChallenges);
router.post("/:userId/friend-challenges", createFriendChallenge);
router.get("/:userId/friend-challenges/notifications", getFriendChallengeNotifications);
router.patch("/:userId/friend-challenges/:challengeId/notifications/read", markFriendChallengeNotificationRead);

export default router;

