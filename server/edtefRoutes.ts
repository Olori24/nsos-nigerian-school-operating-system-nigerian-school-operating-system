import type { Express, Request, Response } from "express";
import { EdtefApiError, requestEdtefJson } from "./edtef";

const STATE_SLUGS = new Set(["abia", "adamawa", "akwa-ibom", "anambra", "bauchi", "bayelsa", "benue", "borno", "cross-river", "delta", "ebonyi", "edo", "ekiti", "enugu", "fct", "gombe", "imo", "jigawa", "kaduna", "kano", "katsina", "kebbi", "kogi", "kwara", "lagos", "nasarawa", "niger", "ogun", "ondo", "osun", "oyo", "plateau", "rivers", "sokoto", "taraba", "yobe", "zamfara"]);
const ENUM_FILTERS = {
  ownership: new Set(["federal", "state", "private", "mission", "community"]),
  gender: new Set(["mixed", "boys", "girls"]),
  boarding: new Set(["day", "boarding", "day_and_boarding"]),
} as const;
const ALLOWED_FILTERS = ["state", "lga", "ownership", "gender", "boarding", "q", "page", "limit"] as const;
const ATTRIBUTION = { name: "EDTEF school directory (edtef.org)", url: "https://edtef.org" };

function sendError(error: unknown, response: Response) {
  if (error instanceof EdtefApiError) {
    if (error.retryAfter) response.set("Retry-After", error.retryAfter);
    response.status(error.status).json({ error: { message: error.message } });
    return;
  }
  response.status(502).json({ error: { message: "EDTEF directory is temporarily unavailable." } });
}

function route(handler: (request: Request) => Promise<unknown>) {
  return async (request: Request, response: Response) => {
    try {
      const data = await handler(request);
      response.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
      response.json({ data, attribution: ATTRIBUTION });
    } catch (error) {
      sendError(error, response);
    }
  };
}

export function registerEdtefRoutes(app: Express) {
  app.get("/api/edtef/states", route(() => requestEdtefJson("directory/v1/states")));

  app.get("/api/edtef/schools", route(request => {
    const query = new URLSearchParams();
    for (const name of ALLOWED_FILTERS) {
      const raw = request.query[name];
      if (raw === undefined) continue;
      if (typeof raw !== "string") throw new EdtefApiError(`Invalid ${name} filter.`, 400);
      const value = raw.trim();
      if (!value) continue;
      if (value.length > 80) throw new EdtefApiError(`Invalid ${name} filter.`, 400);
      if (name === "state" && !STATE_SLUGS.has(value)) throw new EdtefApiError("Invalid state filter.", 400);
      if (name in ENUM_FILTERS && !ENUM_FILTERS[name as keyof typeof ENUM_FILTERS].has(value as never)) {
        throw new EdtefApiError(`Invalid ${name} filter.`, 400);
      }
      if (name === "page" || name === "limit") {
        const parsed = Number(value);
        const maximum = name === "page" ? 10_000 : 200;
        if (!/^\\d+$/.test(value) || !Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
          throw new EdtefApiError(`Invalid ${name} filter.`, 400);
        }
      }
      query.set(name, value);
    }
    return requestEdtefJson("directory/v1/schools", query);
  }));

  app.get("/api/edtef/schools/:id", route(request => {
    const id = request.params.id;
    if (!/^sch_[a-f0-9]{12}$/.test(id)) throw new EdtefApiError("Invalid school identifier.", 400);
    return requestEdtefJson(`directory/v1/schools/${id}`);
  }));
}
