import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const calendarDir = path.join(__dirname, "calendar-data");
fs.mkdirSync(calendarDir, { recursive: true });

function safeCalendarId(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "");
}

function calendarFile(id) {
  return path.join(calendarDir, `${id}.json`);
}

function escapeIcs(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function dateForWeekday(dayName, time = "18:00") {
  const names = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  const target = names.indexOf(dayName);
  const now = new Date();
  const monday = new Date(now);
  const day = now.getDay() || 7;
  monday.setDate(now.getDate() - day + 1);
  const offset = target === 0 ? 6 : target - 1;
  monday.setDate(monday.getDate() + offset);
  const [hours, minutes] = String(time || "18:00").split(":").map(Number);
  monday.setHours(hours || 0, minutes || 0, 0, 0);
  return monday;
}

function formatIcsDate(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function buildCalendar(plan) {
  const stamp = formatIcsDate(new Date());
  const events = (Array.isArray(plan) ? plan : []).map((item) => {
    const start = dateForWeekday(item.day, item.time);
    const end = new Date(start.getTime() + Math.max(30, Number(item.duration || 60)) * 60_000);
    const description = [
      item.type,
      item.distance ? `${item.distance} km` : "",
      item.optional ? "Optional" : "Pflicht",
      item.notes || "",
    ].filter(Boolean).join(" · ");
    return [
      "BEGIN:VEVENT",
      `UID:${escapeIcs(item.id)}@stridehq`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${formatIcsDate(start)}`,
      `DTEND:${formatIcsDate(end)}`,
      `SUMMARY:${escapeIcs(`StrideHQ – ${item.title || item.type || "Training"}`)}`,
      `DESCRIPTION:${escapeIcs(description)}`,
      "END:VEVENT",
    ].join("\r\n");
  });
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//StrideHQ//Training Calendar//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:StrideHQ Trainingsplan",
    ...events,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
const port = Number(process.env.PORT || 3001);
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blockiert Origin: ${origin}`));
    },
  }),
);
app.use(express.json());

app.get("/health", (_, response) => {
  response.json({
    ok: true,
    service: "stridehq-server",
    stravaClientConfigured: Boolean(process.env.STRAVA_CLIENT_ID),
    stravaSecretConfigured: Boolean(process.env.STRAVA_CLIENT_SECRET),
  });
});

app.post("/api/strava/exchange", async (request, response) => {
  try {
    const code = request.body?.code;

    if (!code) {
      return response.status(400).json({ message: "Der Strava-Code fehlt." });
    }

    if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET) {
      return response.status(500).json({
        message: "STRAVA_CLIENT_ID oder STRAVA_CLIENT_SECRET fehlt in der Server-.env.",
      });
    }

    const body = new URLSearchParams({
      client_id: process.env.STRAVA_CLIENT_ID.trim(),
      client_secret: process.env.STRAVA_CLIENT_SECRET.trim(),
      code: String(code).trim(),
      grant_type: "authorization_code",
    });

    const stravaResponse = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
      signal: AbortSignal.timeout(20_000),
    });

    const data = await stravaResponse.json();

    if (!stravaResponse.ok) {
      console.error("Strava token exchange failed:", {
        status: stravaResponse.status,
        response: data,
      });

      return response.status(stravaResponse.status).json({
        message: "Strava hat den Token-Austausch abgelehnt.",
        stravaResponse: data,
      });
    }

    return response.json(data);
  } catch (error) {
    console.error("Token exchange error:", error);
    return response.status(500).json({
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get("/api/strava/activities", async (request, response) => {
  try {
    const accessToken = request.headers.authorization
      ?.replace(/^Bearer\s+/i, "")
      .trim();

    if (!accessToken) {
      return response.status(401).json({ message: "Access Token fehlt." });
    }

    const page = Math.max(1, Number(request.query.page || 1));
    const perPage = Math.min(100, Math.max(1, Number(request.query.perPage || 100)));
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });

    const stravaResponse = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(20_000),
      },
    );

    const data = await stravaResponse.json();

    if (!stravaResponse.ok) {
      console.error("Strava activities failed:", {
        status: stravaResponse.status,
        response: data,
      });

      return response.status(stravaResponse.status).json({
        message: data?.message || "Strava-Aktivitäten konnten nicht geladen werden.",
        details: data,
      });
    }

    return response.json(data);
  } catch (error) {
    console.error("Activities error:", error);
    return response.status(500).json({
      message: error instanceof Error ? error.message : String(error),
    });
  }
});


app.get("/api/strava/activities/all", async (request, response) => {
  try {
    const accessToken = request.headers.authorization
      ?.replace(/^Bearer\s+/i, "")
      .trim();

    if (!accessToken) {
      return response.status(401).json({ message: "Access Token fehlt." });
    }

    const after = Math.max(0, Number(request.query.after || 0));
    const perPage = 100;
    const activities = [];

    for (let page = 1; page <= 100; page += 1) {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
      });

      if (after > 0) params.set("after", String(after));

      const stravaResponse = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?${params}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(20_000),
        },
      );

      const data = await stravaResponse.json();

      if (!stravaResponse.ok) {
        return response.status(stravaResponse.status).json({
          message: data?.message || "Strava-Aktivitäten konnten nicht geladen werden.",
          details: data,
        });
      }

      if (!Array.isArray(data)) {
        return response.status(502).json({ message: "Unerwartete Antwort von Strava." });
      }

      activities.push(...data);
      if (data.length < perPage) break;
    }

    return response.json({ activities, count: activities.length, after });
  } catch (error) {
    console.error("Full activities sync error:", error);
    return response.status(500).json({
      message: error instanceof Error ? error.message : String(error),
    });
  }
});


app.put("/api/calendar/:id", (request, response) => {
  const id = safeCalendarId(request.params.id);
  if (!id) return response.status(400).json({ message: "Ungültige Kalender-ID." });
  const payload = { plan: Array.isArray(request.body?.plan) ? request.body.plan : [], updatedAt: new Date().toISOString() };
  fs.writeFileSync(calendarFile(id), JSON.stringify(payload, null, 2), "utf8");
  return response.json({ ok: true, count: payload.plan.length, updatedAt: payload.updatedAt });
});

app.get("/api/calendar/:id.ics", (request, response) => {
  const id = safeCalendarId(request.params.id);
  if (!id || !fs.existsSync(calendarFile(id))) {
    return response.status(404).type("text/plain").send("Kalender noch nicht synchronisiert.");
  }
  const payload = JSON.parse(fs.readFileSync(calendarFile(id), "utf8"));
  response.setHeader("Content-Type", "text/calendar; charset=utf-8");
  response.setHeader("Content-Disposition", 'inline; filename="stridehq.ics"');
  response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  return response.send(buildCalendar(payload.plan));
});

app.listen(port, () => {
  console.log(`StrideHQ server on ${port}`);
  console.log(`Strava Client-ID configured: ${Boolean(process.env.STRAVA_CLIENT_ID)}`);
  console.log(`Strava Client-Secret configured: ${Boolean(process.env.STRAVA_CLIENT_SECRET)}`);
});
