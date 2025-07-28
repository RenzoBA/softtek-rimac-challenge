import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { SwapiService } from "../services/swapiService";
import { WeatherService } from "../services/weatherService";
import { CacheService } from "../services/cacheService";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { logger } from "../utils/logger";

const swapi = new SwapiService();
const weather = new WeatherService();
const cache = new CacheService();

const isOffline = !!process.env.IS_OFFLINE || !!process.env.SLS_OFFLINE;
const HISTORY_TABLE = process.env.FUSION_HISTORY_TABLE!;

const client = new DynamoDBClient({
  region: isOffline ? "localhost" : process.env.AWS_REGION,
  endpoint: isOffline ? "http://localhost:8000" : undefined,
});
const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":
    "http://rimac-reto-service-docs-dev.s3-website-us-east-1.amazonaws.com",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Accept",
};

export const handler: APIGatewayProxyHandlerV2 = async () => {
  const cacheKey = "fusionados_all";
  try {
    const cached = await cache.get<any[]>(cacheKey);
    if (cached) {
      logger.info("Returning data from cache");
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify(cached),
      };
    }

    const chars = await swapi.getAllCharacters();
    const enriched = await Promise.all(
      chars.map(async (cr) => {
        try {
          const fc = await swapi.enrichCharacter(cr);
          const wc = await weather.getByCity(fc.homeworld);
          return { ...fc, weather: wc };
        } catch (error: any) {
          logger.error(`Error enriching character ${cr.name}:`, error.message);
          return { ...cr, weather: null };
        }
      })
    );
    logger.info(`Enriched ${enriched.length} characters with weather data`);

    await cache.set(cacheKey, enriched, 30 * 60);
    await ddb.send(
      new PutCommand({
        TableName: HISTORY_TABLE,
        Item: {
          id: crypto.randomUUID(),
          entityType: "history",
          createdAt: new Date().toISOString(),
          data: enriched,
        },
      })
    );

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(enriched),
    };
  } catch (error: any) {
    logger.error("Error in fusionados.handler", error.message);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
