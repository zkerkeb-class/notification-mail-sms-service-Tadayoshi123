const pino = require('pino');

const pinoConfig = {
  level: process.env.LOG_LEVEL || 'info',
  serializers: {
    err: pino.stdSerializers.err,
    res: pino.stdSerializers.res,
    req: pino.stdSerializers.req,
  },
};

// N'active pino-pretty qu'en développement pour une meilleure lisibilité.
// En test et production, on utilise le formattage JSON par défaut, plus performant.
if (process.env.NODE_ENV === 'development') {
  pinoConfig.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:dd-mm-yyyy HH:MM:ss',
      ignore: 'pid,hostname',
    },
  };
}

const logger = pino(pinoConfig);

module.exports = logger; 