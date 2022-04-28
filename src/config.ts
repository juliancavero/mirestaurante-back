import convict from 'convict';
import dotEnv from 'dotenv';

export type Config = {
    env: 'production' | 'development' | 'test';
    projectName: string;
    log: {
        level: string;
        enabled: boolean;
    };
    http: {
        host: string;
        port: number;
    };
    fileDB: string;
    maria: {
        host: string;
        port: number;
        root: string;
        user: string;
        password: string;
        database: string;
    };
    mongo: {
        host: string;
        port: number;
        database: string;
    };
};

export function buildConfig(): Config {
    dotEnv.config();
    const config = convict<Config>({
        projectName: {
            doc: 'Fastify project',
            format: String,
            default: 'Default Project',
            env: 'PROJECT_NAME'
        },
        env: {
            doc: 'The application environment.',
            format: ['production', 'development', 'test'],
            default: 'development',
            env: 'NODE_ENV'
        },
        log: {
            level: {
                doc: 'The log level (default info).',
                format: String,
                default: 'info',
                env: 'LOG_LEVEL'
            },
            enabled: {
                doc: 'enable log (default true).',
                format: Boolean,
                default: true,
                env: 'LOG_ENABLED'
            }
        },
        http: {
            host: {
                doc: 'The host ip address to bind the http server.',
                format: String,
                default: '0.0.0.0',
                env: 'HTTP_HOST'
            },
            port: {
                doc: 'The port to bind the http server.',
                format: 'port',
                default: 3099,
                env: 'HTTP_PORT'
            }
        },
        fileDB: {
            doc: 'Database name based on a file.',
            format: String,
            default: 'file-database',
            env: 'FILE_DB_NAME'
        },
        maria: {
            host: {
                doc: 'The host ip address to bind the MariaDB server.',
                format: String,
                default: 'localhost',
                env: 'MARIA_HOST'
            },
            port: {
                doc: 'The port to bind the MariaDB server.',
                format: 'port',
                default: 3306,
                env: 'MARIA_PORT'
            },
            root: {
                doc: 'The root password to bind the MariaDB server.',
                format: String,
                default: 'mypass',
                env: 'MARIA_ROOT_PASSWD'
            },
            user: {
                doc: 'The user to bind the MariaDB server.',
                format: String,
                default: 'tcuser',
                env: 'MARIA_USER_NAME'
            },
            password: {
                doc: 'The user password to bind the MariaDB server.',
                format: String,
                default: 'tcpasswd',
                env: 'MARIA_USER_PASSWD'
            },
            database: {
                doc: 'The database name to bind the MariaDB server.',
                format: String,
                default: 'teamcamp',
                env: 'MARIA_DATABASE_NAME'
            }
        },
        mongo: {
            host: {
                doc: 'The host ip address to bind the MongoDB server.',
                format: String,
                default: 'localhost',
                env: 'MONGO_HOST'
            },
            port: {
                doc: 'The port to bind the MongoDB server.',
                format: 'port',
                default: 27017,
                env: 'MONGO_PORT'
            },
            database: {
                doc: 'The database name to bind the MongoDB server.',
                format: String,
                default: 'teamcamp',
                env: 'MONGO_DATABASE_NAME'
            }
        }
    });
    config.validate({ allowed: 'strict' });
    return config.getProperties();
}
