import { createLogger, format, transports } from 'winston'

const logger = createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  defaultMeta: {
    service: process.env.SERVICE_NAME ?? 'app',
  },
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
})

export default logger
