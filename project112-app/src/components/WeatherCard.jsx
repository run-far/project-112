import { useEffect, useState } from "react";
import { Card } from "./UI";
import { fetchCurrentWeather, getCurrentPosition } from "../services/weather";

function WeatherIcon({ code, isDay }) {
  if ([95, 96, 99].includes(code)) return "⛈️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "🌧️";
  if ([45, 48].includes(code)) return "🌫️";
  if (code === 0) return isDay ? "☀️" : "🌙";
  return isDay ? "⛅" : "☁️";
}

export default function WeatherCard() {
  const [weather, setWeather] = useState(null);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Standort wird ermittelt …");

  async function loadWeather() {
    setStatus("loading");
    setMessage("Standort wird ermittelt …");

    try {
      const position = await getCurrentPosition();
      const current = await fetchCurrentWeather(position.latitude, position.longitude);
      setWeather(current);
      setStatus("ready");
    } catch (error) {
      setWeather(null);
      setStatus("error");
      setMessage(error.message);
    }
  }

  useEffect(() => {
    let active = true;

    getCurrentPosition()
      .then(({ latitude, longitude }) => fetchCurrentWeather(latitude, longitude))
      .then((current) => {
        if (!active) return;
        setWeather(current);
        setStatus("ready");
      })
      .catch((error) => {
        if (!active) return;
        setWeather(null);
        setStatus("error");
        setMessage(error.message);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <Card className="weather-card">
      <div className="weather-heading">
        <div>
          <p className="eyebrow">Wetter am Standort</p>
          {status === "ready" ? <h2>{weather.condition}</h2> : <h2>Aktuelles Wetter</h2>}
        </div>
        {status === "ready" && <span className="weather-icon" aria-hidden="true"><WeatherIcon code={weather.weatherCode} isDay={weather.isDay} /></span>}
      </div>

      {status === "loading" && <p className="muted">{message}</p>}

      {status === "error" && (
        <div>
          <p className="muted">{message}</p>
          <button type="button" onClick={loadWeather}>Erneut versuchen</button>
        </div>
      )}

      {status === "ready" && (
        <>
          <div className="weather-temperature">{weather.temperature}°</div>
          <p className="muted weather-feels">Gefühlt {weather.feelsLike}°</p>
          <div className="weather-details">
            <span><b>{weather.windSpeed} km/h</b> Wind</span>
            <span><b>{weather.windGusts} km/h</b> Böen</span>
            <span><b>{weather.precipitation.toFixed(1)} mm</b> Niederschlag</span>
            <span><b>{weather.humidity} %</b> Feuchte</span>
          </div>
        </>
      )}
    </Card>
  );
}
