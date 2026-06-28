import { Injectable, InternalServerErrorException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Collection, MongoClient } from 'mongodb';

interface JobLogEntry {
  job_id: string;
  text: string;
  created_at: Date;
}

export interface RecentJobLogEntry {
  job_id: string;
  text: string;
  created_at: string;
}

@Injectable()
export class JobLogsStore implements OnModuleInit, OnModuleDestroy {
  private readonly client: MongoClient;
  private readonly databaseName: string;
  private readonly collectionName: string;
  private collection?: Collection<JobLogEntry>;
  private readonly inMemoryLogs = new Map<string, JobLogEntry[]>();

  constructor() {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
    this.databaseName = process.env.MONGO_DB || 'gpt_runner';
    this.collectionName = process.env.MONGO_LOGS_COLLECTION || 'job_logs';
    this.client = new MongoClient(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
  }

  async onModuleInit() {
    try {
      await this.client.connect();
      this.collection = this.client
        .db(this.databaseName)
        .collection<JobLogEntry>(this.collectionName);

      await this.collection.createIndex({ job_id: 1, created_at: -1 });
    } catch (error) {
      this.collection = undefined;
      process.stderr.write(
        `[gpt-runner] Mongo log store unavailable, using in-memory fallback: ${String(error)}\n`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.collection) {
      await this.client.close();
    }
  }

  async append(jobId: string, text: string) {
    if (!text) {
      return;
    }

    if (!this.collection) {
      const entries = this.inMemoryLogs.get(jobId) ?? [];
      entries.push({
        job_id: jobId,
        text,
        created_at: new Date(),
      });
      this.inMemoryLogs.set(jobId, entries);
      return;
    }

    await this.logsCollection().insertOne({
      job_id: jobId,
      text,
      created_at: new Date(),
    });
  }

  async tail(jobId: string, maxBytes: number): Promise<string> {
    if (maxBytes <= 0) {
      return '';
    }

    if (!this.collection) {
      const entries = this.inMemoryLogs.get(jobId) ?? [];
      const chunks: string[] = [];
      let collectedBytes = 0;

      for (const entry of [...entries].reverse()) {
        chunks.push(entry.text);
        collectedBytes += Buffer.byteLength(entry.text, 'utf8');

        if (collectedBytes >= maxBytes) {
          break;
        }
      }

      if (chunks.length === 0) {
        return '';
      }

      const buffer = Buffer.from(chunks.reverse().join(''), 'utf8');
      return buffer.length > maxBytes
        ? buffer.subarray(buffer.length - maxBytes).toString('utf8')
        : buffer.toString('utf8');
    }

    const cursor = this.logsCollection()
      .find({ job_id: jobId }, { projection: { text: 1 } })
      .sort({ created_at: -1, _id: -1 });

    const chunks: string[] = [];
    let collectedBytes = 0;

    for await (const entry of cursor) {
      chunks.push(entry.text);
      collectedBytes += Buffer.byteLength(entry.text, 'utf8');

      if (collectedBytes >= maxBytes) {
        break;
      }
    }

    if (chunks.length === 0) {
      return '';
    }

    const buffer = Buffer.from(chunks.reverse().join(''), 'utf8');
    return buffer.length > maxBytes
      ? buffer.subarray(buffer.length - maxBytes).toString('utf8')
      : buffer.toString('utf8');
  }

  async deleteByJobId(jobId: string) {
    if (!this.collection) {
      this.inMemoryLogs.delete(jobId);
      return;
    }

    await this.logsCollection().deleteMany({ job_id: jobId });
  }

  async recent(limit = 50): Promise<RecentJobLogEntry[]> {
    if (limit <= 0) {
      return [];
    }

    if (!this.collection) {
      const entries = [...this.inMemoryLogs.values()]
        .flat()
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
        .slice(0, limit);

      return entries.map((entry) => ({
        job_id: entry.job_id,
        text: entry.text,
        created_at: entry.created_at.toISOString(),
      }));
    }

    const cursor = this.logsCollection()
      .find({}, { projection: { job_id: 1, text: 1, created_at: 1 } })
      .sort({ created_at: -1, _id: -1 })
      .limit(limit);

    const entries: RecentJobLogEntry[] = [];

    for await (const entry of cursor) {
      entries.push({
        job_id: entry.job_id,
        text: entry.text,
        created_at: entry.created_at.toISOString(),
      });
    }

    return entries;
  }

  private logsCollection(): Collection<JobLogEntry> {
    if (!this.collection) {
      throw new InternalServerErrorException('Mongo log store is not ready.');
    }

    return this.collection;
  }
}
