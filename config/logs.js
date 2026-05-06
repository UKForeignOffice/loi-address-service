import { createLogger, format, transports } from 'winston'

const { combine, timestamp, printf } = format

const logFormat = printf(({ level, message }) => {
  return `${level.toUpperCase()}: ${message} `
})

export const logger = createLogger({
  format: combine(timestamp(), logFormat),
  defaultMeta: { service: 'loi-address-service' },
  transports: [new transports.Console({ level: 'info', handleExceptions: true, handleRejections: true })],
  exitOnError: false,
})
