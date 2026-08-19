import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import * as db from "./db";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { nsosRouter } from "./routers/nsos";
import { z } from "zod";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => {
      if (!opts.ctx.user) return null;
      const { sessionId: _sessionId, taskUid: _taskUid, isCron: _isCron, ...user } = opts.ctx.user;
      return user;
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      if (ctx.user?.sessionId) await db.revokeUserSession({ userId: ctx.user.id, sessionId: ctx.user.sessionId, reason: "Signed out" });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    sessions: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        const sessions = await db.listActiveUserSessions(ctx.user.id);
        return sessions.map(session => ({ ...session, current: session.id === ctx.user.sessionId }));
      }),
      revoke: protectedProcedure.input(z.object({ sessionId: z.string().min(1).max(64) })).mutation(async ({ ctx, input }) => {
        if (!ctx.user.sessionId) throw new Error("This session cannot be managed from the dashboard.");
        if (input.sessionId === ctx.user.sessionId) throw new Error("Use Sign out to end this current session.");
        const revoked = await db.revokeUserSession({ userId: ctx.user.id, sessionId: input.sessionId, reason: "Revoked by account owner" });
        if (!revoked) throw new Error("That session is no longer active.");
        return { success: true } as const;
      }),
      revokeOthers: protectedProcedure.mutation(async ({ ctx }) => {
        if (!ctx.user.sessionId) throw new Error("This session cannot be managed from the dashboard.");
        const revokedCount = await db.revokeOtherUserSessions({ userId: ctx.user.id, currentSessionId: ctx.user.sessionId, reason: "Signed out from other devices" });
        return { success: true, revokedCount } as const;
      }),
    }),
  }),
  nsos: nsosRouter,
});

export type AppRouter = typeof appRouter;
