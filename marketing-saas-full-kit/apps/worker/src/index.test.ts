import { QUEUE_NAME, getRedisConnectionOptions } from './index.js'

describe('worker bootstrap', () => {
  it('exposes the expected queue name', () => {
    expect(QUEUE_NAME).toBe('mktg-jobs')
  })

  it('creates BullMQ-compatible redis options', () => {
    expect(getRedisConnectionOptions('redis://localhost:6379')).toMatchObject({
      connectionName: 'mktg-worker',
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    })
  })
})
