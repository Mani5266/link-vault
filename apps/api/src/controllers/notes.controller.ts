import { Request, Response } from "express";
import { ApiResponse } from "../utils/apiResponse";
import { logger } from "../utils/logger";
import { supabaseAdmin } from "../config/supabase";

export class NotesController {
  /**
   * GET /api/v1/links/:linkId/notes
   */
  static async getNotes(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const linkId = Array.isArray(req.params.linkId)
        ? req.params.linkId[0]
        : req.params.linkId;

      const { data, error } = await supabaseAdmin
        .from("link_notes")
        .select("*")
        .eq("link_id", linkId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        logger.error({ error }, "Failed to fetch notes");
        ApiResponse.error(res, "Failed to fetch notes");
        return;
      }

      ApiResponse.success(res, data || []);
    } catch (error: any) {
      logger.error({ error }, "Failed to get notes");
      ApiResponse.error(res, error.message);
    }
  }

  /**
   * POST /api/v1/links/:linkId/notes
   */
  static async createNote(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const linkId = Array.isArray(req.params.linkId)
        ? req.params.linkId[0]
        : req.params.linkId;
      const { content } = req.body;

      if (!content || typeof content !== "string" || !content.trim()) {
        ApiResponse.badRequest(res, "Note content is required");
        return;
      }

      const { data, error } = await supabaseAdmin
        .from("link_notes")
        .insert({
          link_id: linkId,
          user_id: userId,
          content: content.trim(),
        })
        .select()
        .single();

      if (error) {
        logger.error({ error }, "Failed to create note");
        ApiResponse.error(res, "Failed to create note");
        return;
      }

      // Increment notes_count
      try {
        await supabaseAdmin.rpc("increment_notes_count", { lid: linkId });
      } catch {
        // Non-critical
      }

      ApiResponse.created(res, data, "Note created");
    } catch (error: any) {
      logger.error({ error }, "Failed to create note");
      ApiResponse.error(res, error.message);
    }
  }

  /**
   * PATCH /api/v1/links/:linkId/notes/:noteId
   */
  static async updateNote(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const noteId = Array.isArray(req.params.noteId)
        ? req.params.noteId[0]
        : req.params.noteId;
      const { content } = req.body;

      if (!content || typeof content !== "string" || !content.trim()) {
        ApiResponse.badRequest(res, "Note content is required");
        return;
      }

      const { data, error } = await supabaseAdmin
        .from("link_notes")
        .update({
          content: content.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", noteId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        logger.error({ error }, "Failed to update note");
        ApiResponse.error(res, "Failed to update note");
        return;
      }

      ApiResponse.success(res, data, "Note updated");
    } catch (error: any) {
      logger.error({ error }, "Failed to update note");
      ApiResponse.error(res, error.message);
    }
  }

  /**
   * DELETE /api/v1/links/:linkId/notes/:noteId
   */
  static async deleteNote(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const linkId = Array.isArray(req.params.linkId)
        ? req.params.linkId[0]
        : req.params.linkId;
      const noteId = Array.isArray(req.params.noteId)
        ? req.params.noteId[0]
        : req.params.noteId;

      const { error } = await supabaseAdmin
        .from("link_notes")
        .delete()
        .eq("id", noteId)
        .eq("user_id", userId);

      if (error) {
        logger.error({ error }, "Failed to delete note");
        ApiResponse.error(res, "Failed to delete note");
        return;
      }

      // Decrement notes_count
      try {
        await supabaseAdmin.rpc("decrement_notes_count", { lid: linkId });
      } catch {
        // Non-critical
      }

      ApiResponse.success(res, null, "Note deleted");
    } catch (error: any) {
      logger.error({ error }, "Failed to delete note");
      ApiResponse.error(res, error.message);
    }
  }
}
