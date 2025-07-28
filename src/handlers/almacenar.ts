import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import Joi from "joi";
import { DBService } from "../services/dbService";
import { logger } from "../utils/logger";

const schema = Joi.object().unknown(true);
const db = new DBService();

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":
    "http://rimac-reto-service-docs-dev.s3-website-us-east-1.amazonaws.com",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Accept",
};

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { error } = schema.validate(body);
    if (error) {
      logger.warn("Validation failed in almacenar handler", error.message);
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: error.message }),
      };
    }

    await db.putCustomData(body);
    logger.info("Data stored successfully in almacenar handler");
    return {
      statusCode: 201,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Data stored" }),
    };
  } catch (error: any) {
    logger.error("Error in almacenar.handler", error.message);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
