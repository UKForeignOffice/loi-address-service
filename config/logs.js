const { createLogger, format, transports } = require('winston');
const { combine, splat, timestamp, printf } = format;

const logFormat = printf( ({ level, message, timestamp}) => {
    return `${level}: ${message} `
});

const logger = createLogger({
    format: combine(timestamp(), logFormat),
    defaultMeta: { service: 'loi-address-service' },
    transports: [
        new transports.Console({level: 'error', handleExceptions: true, handleRejections: true}),
        new transports.Console({level: 'info', handleExceptions: true, handleRejections: true})
    ],
    exitOnError: false
});

module.exports = logger;


