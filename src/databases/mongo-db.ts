import { MongoClient, Db } from 'mongodb';

export type MongoConfig = {
    host: string;
    port: number;
    database: string;
};
export function buildMongoDatabase({ host, port, database }: MongoConfig) {
    let client: MongoClient;
    let db: Db;
    async function init() {
        const url = `mongodb://${host}:${port}`;
        client = new MongoClient(url);
        await client.connect();
        db = client.db(database);
    }

    function getCollection() {
        return db.collection('reservas');
    }

    function getDatabase() {
        return db;
    }


    async function close() {
        await client.close();
    }

    return {
        init,
        getDatabase,
        getCollection,
        close
    };
}

export type NOSQL_DB = ReturnType<typeof buildMongoDatabase>;
