import type { Express, Request, Response } from "express";
import { EdtefApiError, requestEdtefJson } from "./edtef";

const ALLOWED_FILTERS = ["state", "lga", "ownership", "gender", "boarding", "page", "per_page"] as const;
const ATTRIBUTION = { name: "EDTEF school directory (edtef.org)", url: "https://edtef.org" };

function queryValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

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
      const value = queryValue(request.query[name]);
      if (!value) continue;
      if (value.length > 100) throw new EdtefApiError(`Invalid ${name} filter.`, 400);
      if (name === "page" || name === "per_page") {
        const parsed = Number(value);
        if (!Number.isInteger(parsed) || parsed < 1 || parsed > (name === "page" ? 10_000 : 100)) {
          throw new EdtefApiError(`Invalid ${name} filter.`, 400);
        }
      }
      if (name === "boarding" && !["true", "false", "1", "0"].includes(value.toLowerCase())) {
        throw new EdtefApiError("Invalid boarding filter.", 400);
      }
      query.set(name, value);
    }
    return requestEdtefJson("directory/v1/schools", query);
  }));

  app.get("/api/edtef/schools/:id", route(request => {
    const id = request.params.id;
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new EdtefApiError("Invalid school identifier.", 400);
    return requestEdtefJson(`directory/v1/schools/${id}`);
  }));
}
