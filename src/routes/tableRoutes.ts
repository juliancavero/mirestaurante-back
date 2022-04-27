import { FastifyPluginCallback } from "fastify";
import { NOSQL_DB } from "../databases/mongo-db";

export function buildTableRutesPlugin (): FastifyPluginCallback<{
    dbNoSql: NOSQL_DB;
}> {

    return async function getTableRoutes(server, options, done){
        const { dbNoSql } = options;

        const dataBase = dbNoSql.getDatabase();

        // await dataBase.createCollection('reservas');

        await dataBase.collection('reservas').insertOne({name: "prueba"});

        done();
    }
}