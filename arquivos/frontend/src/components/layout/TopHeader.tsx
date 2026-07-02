import type { CSSProperties } from "react";
import { Link } from "react-router-dom";

import "./TopHeader.css";

type WeatherSummary = {
  city: string;
  temperature: string;
  condition: string;
  humidity: string;
  wind: string;
  rain?: string;
};

type TopHeaderAction = {
  label: string;
  to: string;
  icon?: string;
};

type TopHeaderProps = {
  title: string;
  helper: string;
  image: string;
  mobileImage?: string;
  weather: WeatherSummary;
  action?: TopHeaderAction;
};

type HeaderStyle = CSSProperties & {
  "--header-desktop-image": string;
  "--header-mobile-image": string;
};

export default function TopHeader({
  title,
  helper,
  image,
  mobileImage,
  weather,
  action,
}: TopHeaderProps) {
  const headerStyle: HeaderStyle = {
    "--header-desktop-image": `url(${image})`,
    "--header-mobile-image": `url(${mobileImage || image})`,
  };

  return (
    <header className="espiagro-top-header">
      <section className="espiagro-top-header-card" style={headerStyle}>
        <div className="espiagro-top-header-background" aria-hidden="true" />

        <div className="espiagro-top-header-overlay">
          <div className="espiagro-top-header-main">
            <div className="espiagro-top-header-text">
              <h1>{title}</h1>
              <p>{helper}</p>
            </div>

            {action ? (
              <Link className="espiagro-top-header-action" to={action.to}>
                <span className="espiagro-top-header-action-icon">
                  {action.icon || "＋"}
                </span>
                <strong>{action.label}</strong>
              </Link>
            ) : null}
          </div>

          <aside className="espiagro-top-header-weather" aria-label="Clima atual">
            <div className="espiagro-top-header-weather-head">
              <span>Clima atual</span>
              <strong>{weather.city}</strong>
            </div>

            <div className="espiagro-top-header-weather-body">
              <strong className="espiagro-top-header-temperature">
                {weather.temperature}
              </strong>

              <span className="espiagro-top-header-condition">
                {weather.condition}
              </span>
            </div>

            <div
              className={`espiagro-top-header-weather-grid ${
                weather.rain ? "has-rain" : ""
              }`}
            >
              <div className="espiagro-top-header-weather-item">
                <span>Umidade</span>
                <strong>{weather.humidity}</strong>
              </div>

              <div className="espiagro-top-header-weather-item">
                <span>Vento</span>
                <strong>{weather.wind}</strong>
              </div>

              {weather.rain ? (
                <div className="espiagro-top-header-weather-item">
                  <span>Chuva</span>
                  <strong>{weather.rain}</strong>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </section>
    </header>
  );
}