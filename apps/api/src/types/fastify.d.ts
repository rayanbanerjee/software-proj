import type { PrismaClient } from "@prisma/client";
import type { UserProfile } from "@repo/shared-types";
import type { AppLogger } from "../common/logger.js";
import type { AiService } from "../modules/ai/service.js";
import type { AuditService } from "../modules/audit/service.js";
import type { GoogleIdTokenVerifier } from "../modules/auth/google-id-token.js";
import type { AuthSessionService, VerifiedAuthSession } from "../modules/auth/session.js";
import type { CommentsService } from "../modules/comments/service.js";
import type { DocumentsService } from "../modules/documents/service.js";
import type { ExportsService } from "../modules/exports/service.js";
import type { SharingService } from "../modules/sharing/service.js";
import type { VersionsService } from "../modules/versions/service.js";
import type { ApiEnv } from "../config/env.js";

declare module "fastify" {
  interface FastifyInstance {
    aiService: AiService;
    apiEnv: ApiEnv;
    appLogger: AppLogger;
    authSessionService: AuthSessionService;
    auditService: AuditService;
    commentsService: CommentsService;
    documentsService: DocumentsService;
    exportsService: ExportsService;
    googleIdTokenVerifier: GoogleIdTokenVerifier | null;
    prisma: PrismaClient;
    sharingService: SharingService;
    versionsService: VersionsService;
  }

  interface FastifyRequest {
    authSession?: VerifiedAuthSession;
    currentUser?: UserProfile;
    requestId?: string;
    requestStartedAt?: bigint;
  }
}
