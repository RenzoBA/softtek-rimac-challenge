import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DBService } from "../services/dbService";
import { logger } from "../utils/logger";

const db = new DBService();

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":
    "http://rimac-reto-service-docs-dev.s3-website-us-east-1.amazonaws.com",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Accept",
};

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const limit = params.limit ? parseInt(params.limit, 10) : 10;
    const lastKey = params.lastKey
      ? JSON.parse(decodeURIComponent(params.lastKey))
      : undefined;

    const { items, lastKey: newLastKey } = await db.getHistory(limit, lastKey);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        items,
        lastKey: newLastKey
          ? encodeURIComponent(JSON.stringify(newLastKey))
          : null,
      }),
    };
  } catch (error: any) {
    logger.error("Error in historial.handler", error.message);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
