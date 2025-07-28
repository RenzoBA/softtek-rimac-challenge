import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { logger } from "../utils/logger";

const isOffline = !!process.env.IS_OFFLINE || !!process.env.SLS_OFFLINE;

const client = new DynamoDBClient({
  region: isOffline ? "localhost" : process.env.AWS_REGION,
  endpoint: isOffline ? "http://localhost:8000" : undefined,
});
const ddb = DynamoDBDocumentClient.from(client);

export class DBService {
  private readonly customTable = process.env.CUSTOM_DATA_TABLE!;
  private readonly historyTable = process.env.FUSION_HISTORY_TABLE!;

  async putCustomData<T>(data: T): Promise<void> {
    try {
      await ddb.send(
        new PutCommand({
          TableName: this.customTable,
          Item: { id: crypto.randomUUID(), data },
        })
      );
      logger.info("Custom data inserted successfully");
    } catch (error: any) {
      logger.error("Error inserting custom data", error.message);
      throw new Error("Failed to insert custom data");
    }
  }

  async getHistory(limit: number, lastKey?: Record<string, any>) {
    const params: any = {
      TableName: this.historyTable,
      IndexName: "byCreatedAt",
      KeyConditionExpression: "entityType = :etype",
      ExpressionAttributeValues: { ":etype": "history" },
      Limit: limit,
      ScanIndexForward: false,
    };
    if (lastKey) params.ExclusiveStartKey = lastKey;

    try {
      logger.info("Fetching history with params", params);
      const resp = await ddb.send(new QueryCommand(params));
      logger.info(
        `Fetched ${resp.Items?.length || 0} items from history, lastKey: ${
          resp.LastEvaluatedKey ? JSON.stringify(resp.LastEvaluatedKey) : "none"
        }`
      );
      return { items: resp.Items || [], lastKey: resp.LastEvaluatedKey };
    } catch (error: any) {
      logger.error("Error fetching history", error.message);
      throw new Error("Failed to fetch history");
    }
  }
}
