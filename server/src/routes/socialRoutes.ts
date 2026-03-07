import { Router } from "express";
import {
  getFriends,
  getFriendSuggestions,
  addFriendByEmail,
  removeFriend,
  getGlobalItMap,
  getFriendChallenges,
  createFriendChallenge,
  getFriendChallengeNotifications,
  markFriendChallengeNotificationRead
} from "../controllers/socialController.js";

const router = Router();

router.get("/:userId/friends", getFriends);
router.get("/:userId/friends/suggestions", getFriendSuggestions);
router.post("/:userId/friends", addFriendByEmail);
router.delete("/:userId/friends/:friendUserId", removeFriend);

router.get("/:userId/global-map", getGlobalItMap);

router.get("/:userId/challenges", getFriendChallenges);
router.post("/:userId/challenges", createFriendChallenge);

router.get("/:userId/challenge-notifications", getFriendChallengeNotifications);
router.post("/:userId/challenge-notifications/:challengeId/read", markFriendChallengeNotificationRead);

export default router;