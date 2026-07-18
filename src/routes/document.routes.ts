import { Router } from "express";
import { z } from "zod";
import { analyze, downloadReport, get, list, remove, upload } from "../controllers/document.controller.js";
import { authenticate } from "../middleware/auth.js";
import { uploadDocument } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";

export const documentRouter = Router();
documentRouter.use(authenticate);
documentRouter.get("/", list);
documentRouter.post("/upload", uploadDocument.single("file"), upload);
documentRouter.get("/:id", get);
documentRouter.post("/:id/analyze", validate(z.object({ body: z.object({ scholarshipId: z.string().optional() }), query: z.any(), params: z.any() })), analyze);
documentRouter.get("/reports/:analysisId/download", downloadReport);
documentRouter.delete("/:id", remove);
