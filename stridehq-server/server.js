import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
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

app.listen(port, () => {
  console.log(`StrideHQ server on ${port}`);
  console.log(`Strava Client-ID configured: ${Boolean(process.env.STRAVA_CLIENT_ID)}`);
  console.log(`Strava Client-Secret configured: ${Boolean(process.env.STRAVA_CLIENT_SECRET)}`);
});
