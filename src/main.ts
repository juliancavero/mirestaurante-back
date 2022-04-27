import { buildConfig } from './config';
import gracefulShutdown from './graceful-shutdown';
import 'make-promises-safe';
import { buildApp } from './app';
import { buildLogger } from './logger';
import { buildMongoDatabase, NOSQL_DB } from './databases/mongo-db';

const config = buildConfig();
const logger = buildLogger(config.log);

let dbNoSql: NOSQL_DB;

async function main() {
    logger.info(`Starting ${config.projectName}`);
    const { http, mongo } = config;

    dbNoSql = buildMongoDatabase(mongo);

    await dbNoSql.init();

    const app = await buildApp({ logger, dbNoSql });
    
    await app.getServer().listen(http.port, http.host);
    process.on('SIGTERM', gracefulShutdown(app, logger, dbNoSql));
    process.on('SIGINT', gracefulShutdown(app, logger, dbNoSql));
}

main().catch(error => {
    logger.error(
        `Error while starting up ${config.projectName}. ${error.message}`
    );
    process.exit(1);
});
