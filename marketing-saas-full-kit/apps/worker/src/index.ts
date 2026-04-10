import { Worker } from 'bullmq'
import { Redis, type RedisOptions } from 'ioredis'

import { logger } from '@mktg/utils'

export const QUEUE_NAME = 'mktg-jobs'

export function getRedisConnectionOptions(redisUrl = process.env.REDIS_URL) {
  if (!redisUrl) {
    throw new Error('REDIS_URL is required to start the worker')
  }

  return {
    connectionName: 'mktg-worker',
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  } satisfies RedisOptions
}

export function createWorker(redisUrl = process.env.REDIS_URL) {
  const connection = new Redis(redisUrl ?? '', getRedisConnectionOptions(redisUrl))

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      logger.info('BullMQ worker received job', {
        queue: QUEUE_NAME,
        jobId: job.id,
        jobName: job.name,
      })
    },
    { connection },
  )

  worker.on('completed', (job) => {
    logger.info('BullMQ job completed', { queue: QUEUE_NAME, jobId: job.id, jobName: job.name })
  })

  worker.on('failed', (job, error) => {
    logger.error('BullMQ job failed', {
      queue: QUEUE_NAME,
      jobId: job?.id,
      jobName: job?.name,
      error: error.message,
    })
  })

  return worker
}

export async function startWorker() {
  const worker = createWorker()
  await worker.waitUntilReady()

  logger.info('BullMQ worker started', {
    queue: QUEUE_NAME,
    redisUrl: process.env.REDIS_URL,
  })

  return worker
}

if (process.env.NODE_ENV !== 'test') {
  void startWorker().catch((error) => {
    logger.error('Unable to start BullMQ worker', {
      error: error instanceof Error ? error.message : error,
    })
    process.exitCode = 1
  })
}
