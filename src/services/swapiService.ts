import axios, { AxiosInstance } from "axios";
import { logger } from "../utils/logger";

interface CharacterRaw {
  uid: string;
  name: string;
  url: string;
}
interface FusionCharacter {
  name: string;
  homeworld: string;
}

export class SwapiService {
  private client: AxiosInstance;
  private readonly baseUrl = "https://swapi.tech/api";

  constructor() {
    this.client = axios.create({ baseURL: this.baseUrl, timeout: 8000 });
  }

  async getAllCharacters(): Promise<CharacterRaw[]> {
    const results: CharacterRaw[] = [];
    let path = "/people/";
    try {
      while (path) {
        const resp = await this.client.get<{
          results: CharacterRaw[];
          next: string | null;
        }>(path);
        results.push(...resp.data.results);
        path = resp.data.next ? resp.data.next.replace(this.baseUrl, "") : "";
      }
      return results;
    } catch (error: any) {
      logger.error("Error fetching all SWAPI characters", error.message);
      throw new Error("Failed to fetch characters from SWAPI");
    }
  }

  async enrichCharacter(cr: CharacterRaw): Promise<FusionCharacter> {
    try {
      const charResp = await this.client.get<{ result: { properties: any } }>(
        cr.url.replace(this.baseUrl, "")
      );
      const homeworldUrl = charResp.data.result.properties.homeworld;
      if (!homeworldUrl) {
        logger.warn(`Character ${cr.name} has no homeworld`);
        return { name: cr.name, homeworld: "Unknown" };
      }
      const hwResp = await this.client.get<{ result: { properties: any } }>(
        homeworldUrl.replace(this.baseUrl, "")
      );
      return {
        name: cr.name,
        homeworld: hwResp.data.result.properties.name || "Unknown",
      };
    } catch (error: any) {
      logger.error(`Error enriching character ${cr.name}`, error.message);
      return { name: cr.name, homeworld: "Unknown" };
    }
  }
}
