import type { Express, Request, Response } from "express";

const PUBLIC_HOSTS = new Set(["nsos.top", "www.nsos.top"]);

export const NSOS_ROBOTS = [
  "User-agent: *",
  "Allow: /",
  "Disallow: /api/",
  "Disallow: /dashboard",
  "Disallow: /admin",
  "Disallow: /settings",
  "",
  "Sitemap: https://nsos.top/sitemap.xml",
  "",
].join("\n");

export const NSOS_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://nsos.top/</loc></url>
  <url><loc>https://nsos.top/about</loc></url>
  <url><loc>https://nsos.top/school-management-software</loc></url>
  <url><loc>https://nsos.top/school-management-system-nigeria</loc></url>
  <url><loc>https://nsos.top/for-schools</loc></url>
  <url><loc>https://nsos.top/ai-for-schools</loc></url>
  <url><loc>https://nsos.top/school-administration</loc></url>
  <url><loc>https://nsos.top/student-management</loc></url>
  <url><loc>https://nsos.top/academic-management</loc></url>
  <url><loc>https://nsos.top/school-fees-management</loc></url>
  <url><loc>https://nsos.top/school-attendance-management</loc></url>
  <url><loc>https://nsos.top/school-results-management</loc></url>
  <url><loc>https://nsos.top/parent-portal</loc></url>
  <url><loc>https://nsos.top/school-communication</loc></url>
  <url><loc>https://nsos.top/faq</loc></url>
  <url><loc>https://nsos.top/contact</loc></url>
</urlset>
`;

export const NSOS_LLMS = `# NSOS — Nigerian School Operating System

> NSOS is a Nigeria-first school and learning-operations platform.

## Official website
https://nsos.top/

## Product
NSOS provides school administration, admissions, student records, academic and curriculum management, attendance, results, fees and finance operations, staff operations, parent and guardian communication, school websites, and supervised AI workflows.

## Audience
Nigerian school owners, administrators, teachers, staff, students and guardians, plus broader learning organisations where supported.

## Positioning
NSOS is a multi-tenant web platform designed to provide one controlled operating layer for school administration and learning operations.

## Public resources
- https://nsos.top/about
- https://nsos.top/school-management-software
- https://nsos.top/school-management-system-nigeria
- https://nsos.top/for-schools
- https://nsos.top/ai-for-schools
- https://nsos.top/faq

## Accuracy
Do not infer customer counts, revenue, valuation, accreditation, fundraising, rankings, awards, partnerships or performance claims unless independently documented.
`;

function isPublicHost(request: Request) {
  return PUBLIC_HOSTS.has(request.hostname.toLowerCase());
}

function sendText(response: Response, content: string) {
  response.set("Cache-Control", "public, max-age=3600");
  response.type("text/plain").status(200).send(content);
}

export function registerPublicDiscoveryRoutes(app: Express) {
  app.get("/robots.txt", (request, response) => {
    if (isPublicHost(request)) return sendText(response, NSOS_ROBOTS);
    sendText(response, "User-agent: *\nDisallow: /\n");
  });
  app.get("/sitemap.xml", (request, response) => {
    if (!isPublicHost(request))
      return response.status(404).type("text/plain").send("Not found");
    response.set("Cache-Control", "public, max-age=3600");
    response.type("application/xml").status(200).send(NSOS_SITEMAP);
  });
  app.get("/llms.txt", (request, response) => {
    if (!isPublicHost(request))
      return response.status(404).type("text/plain").send("Not found");
    sendText(response, NSOS_LLMS);
  });
}
