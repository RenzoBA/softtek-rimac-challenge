import axios, { AxiosInstance } from "axios";
import { logger } from "../utils/logger";

export interface WeatherInfo {
  temp: number;
  description: string;
}

const FALLBACK_CITIES = [
  "London",
  "Tokyo",
  "Paris",
  "Sydney",
  "Moscow",
  "Toronto",
  "Berlin",
  "Dubai",
];

function getRandomCity(): string {
  const idx = Math.floor(Math.random() * FALLBACK_CITIES.length);
  return FALLBACK_CITIES[idx];
}

export class WeatherService {
  private client: AxiosInstance;
  private readonly baseUrl = "https://api.openweathermap.org/data/2.5";
  private readonly apiKey: string;

  constructor() {
    if (!process.env.WEATHER_API_KEY) {
      logger.error("WEATHER_API_KEY not defined in environment variables");
      throw new Error("WEATHER_API_KEY not defined");
    }
    this.apiKey = process.env.WEATHER_API_KEY;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 8000,
    });
  }

  async getByCity(city: string): Promise<WeatherInfo> {
    const tryFetch = async (q: string): Promise<WeatherInfo> => {
      try {
        const resp = await this.client.get("/weather", {
          params: { q, units: "metric", appid: this.apiKey },
        });
        const d = resp.data;
        return {
          temp: d.main.temp,
          description: d.weather[0].description,
        };
      } catch (error: any) {
        logger.warn(`Weather fetch failed for city: ${q}`, error.message);
        throw error;
      }
    };

    try {
      return await tryFetch(city);
    } catch (error: any) {
      if (error.response?.status === 404) {
        const fallback = getRandomCity();
        logger.info(`City "${city}" not found. Falling back to "${fallback}".`);
        return await tryFetch(fallback);
      }
      logger.error(`Error fetching weather for city: ${city}`, error.message);
      throw new Error("Failed to fetch weather data");
    }
  }

  async getByCoords(lat: number, lon: number): Promise<WeatherInfo> {
    try {
      const resp = await this.client.get("/weather", {
        params: { lat, lon, units: "metric", appid: this.apiKey },
      });
      const d = resp.data;
      return { temp: d.main.temp, description: d.weather[0].description };
    } catch (error: any) {
      logger.error(
        `Error fetching weather for coords: ${lat},${lon}`,
        error.message
      );
      throw new Error("Failed to fetch weather data by coordinates");
    }
  }
}
