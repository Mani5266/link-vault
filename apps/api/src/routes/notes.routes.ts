import { Router } from "express";
import { NotesController } from "../controllers/notes.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router({ mergeParams: true });

router.use(authMiddleware);

router.get("/", NotesController.getNotes);
router.post("/", NotesController.createNote);
router.patch("/:noteId", NotesController.updateNote);
router.delete("/:noteId", NotesController.deleteNote);

export default router;
