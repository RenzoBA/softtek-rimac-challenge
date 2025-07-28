import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { logger } from "../utils/logger";

const isOffline = !!process.env.IS_OFFLINE || !!process.env.SLS_OFFLINE;

const client = new DynamoDBClient({
  region: isOffline ? "localhost" : process.env.AWS_REGION,
  endpoint: isOffline ? "http://localhost:8000" : undefined,
});
const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

interface CacheEntry<T> {
  key: string;
  data: T;
  expiresAt: number;
}

export class CacheService {
  private readonly cacheTable = process.env.FUSION_CACHE_TABLE!;

  async get<T>(key: string): Promise<T | null> {
    try {
      const resp = await ddb.send(
        new GetCommand({ TableName: this.cacheTable, Key: { key } })
      );
      logger.info(`Cache get: ${key}, found: ${resp.Item ? "yes" : "no"}`);
      const item = resp.Item as CacheEntry<T> | undefined;
      if (!item) return null;
      if (item.expiresAt < Date.now()) {
        logger.info(`Cache expired for key: ${key}`);
        return null;
      }
      return item.data;
    } catch (error: any) {
      logger.error(`Error fetching cache for key: ${key}`, error.message);
      return null;
    }
  }

  async set<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const entry: CacheEntry<T> = { key, data, expiresAt };
    try {
      logger.info("Writing cache to DynamoDB", {
        TableName: this.cacheTable,
        Item: entry,
      });
      await ddb.send(
        new PutCommand({ TableName: this.cacheTable, Item: entry })
      );
      logger.info(
        `Cache set: ${key}, expires at: ${new Date(expiresAt).toISOString()}`
      );
    } catch (error: any) {
      logger.error(`Error setting cache for key: ${key}`, error.message);
      throw new Error("Failed to set cache entry");
    }
  }
}
