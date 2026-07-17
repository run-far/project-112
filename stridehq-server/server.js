import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();

const port = Number(process.env.PORT || 3001);
const allowedOrigins = (
  process.env.FRONTEND_ORIGIN || "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim());

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

app.get("/health", (_, res) => {
  res.json({
    ok: true,
    service: "stridehq-server",
    stravaClientConfigured: Boolean(process.env.STRAVA_CLIENT_ID),
    stravaSecretConfigured: Boolean(process.env.STRAVA_CLIENT_SECRET),
  });
});

app.post("/api/strava/exchange", async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        error: "code_missing",
        message: "Der Strava-Autorisierungscode fehlt.",
      });
    }

    if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET) {
      return res.status(500).json({
        error: "strava_credentials_missing",
        message:
          "STRAVA_CLIENT_ID oder STRAVA_CLIENT_SECRET fehlt in stridehq-server/.env.",
      });
    }

    const body = new URLSearchParams({
      client_id: process.env.STRAVA_CLIENT_ID.trim(),
      client_secret: process.env.STRAVA_CLIENT_SECRET.trim(),
      code: code.trim(),
      grant_type: "authorization_code",
    });

    const response = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
    });

    const responseText = await response.text();

    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      data = {
        error: "invalid_strava_response",
        message: responseText,
      };
    }

    if (!response.ok) {
      console.error("Strava token exchange failed:", {
        status: response.status,
        response: data,
      });

      return res.status(response.status).json({
        error: "strava_token_exchange_failed",
        stravaStatus: response.status,
        stravaResponse: data,
      });
    }

    return res.json(data);
  } catch (error) {
    console.error("Token exchange error:", error);

    return res.status(500).json({
      error: "token_exchange_internal_error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get("/api/strava/activities", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return res.status(401).json({
        error: "token_missing",
        message: "Access Token fehlt.",
      });
    }

    const response = await fetch(
      "https://www.strava.com/api/v3/athlete/activities?per_page=100&page=1",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Strava activities failed:", {
        status: response.status,
        response: data,
      });

      return res.status(response.status).json(data);
    }

    return res.json(data);
  } catch (error) {
    console.error("Activities error:", error);

    return res.status(500).json({
      error: "activities_internal_error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

app.listen(port, () => {
  console.log(`StrideHQ server on ${port}`);
  console.log(
    `Strava Client-ID configured: ${Boolean(process.env.STRAVA_CLIENT_ID)}`,
  );
  console.log(
    `Strava Client-Secret configured: ${Boolean(
      process.env.STRAVA_CLIENT_SECRET,
    )}`,
  );
});