import fastify, { FastifyInstance, FastifyRequest, /* FastifySchema */ } from 'fastify';
import type { Logger } from 'pino';
import { NOSQL_DB } from './databases/mongo-db';
import fastifyCors from 'fastify-cors';
import { ObjectId } from 'mongodb';
import multer from 'fastify-multer';
// import fastifyStatic  from 'fastify-static';
import path from 'path';

// import { buildTableRutesPlugin } from './routes/tableRoutes';

/* const MessageSchema: FastifySchema = {
    body: {
        type: 'object',
        properties: {
            message: { type: 'string' },
            from: { type: 'string', require },
            to: { type: 'string' }
        }
    }
}; */

type Table = {
    id: number;
    status: ('Available' | 'Taken' | 'Reserved');
    size: number;
    name?: string;
}

type NewTableType = {
    size: number;
}

export type CartaType = Categoria[];

export type Categoria = {
    name: string;
    items: Item[];
}
export type NewCategory = {
    name: string;
}
export type ItemInsert = {
    name: string;
    items: ItemSendType;
}

export type Item = {
    id: string;
    name: string;
    price: number;
    photo: string;
}

export type ItemSendType = {
    name: string;
    price: number;
    photo: string;
}

type Order = {
    _id: ObjectId;
    name: string;
    items: Item[];
}
type OrderRequest = {
    name: string;
    tableId: number;
    items: ItemSendType[];
}

export type ServerDeps = {
    logger: Logger;
    dbNoSql: NOSQL_DB;
};




export function buildServer({
    logger,
    dbNoSql
}: ServerDeps): FastifyInstance {
    const server = fastify({ logger });
    const database = dbNoSql.getDatabase();

    const storage = multer.diskStorage({
        destination: function (req, file, callback) {
            callback(null, path.join(__dirname, '../public/images/'))
        },
        filename: function (req, file, callback){
            callback(null, file.originalname)
        }
    })

    const upload = multer({ storage: storage });

    // CORS

    server.register(fastifyCors, {
        origin: '*',
        methods: 'GET,PUT,POST,DELETE',
        allowedHeaders: ['Content-Type']
    });

    // IMAGENES
    
    server.register(multer.contentParser);

    server.post('/cartaItemPhoto', { preHandler: upload.single('cartaItemPhoto')}, function (req, res){
        res
            .code(200)
            .headers({
                'Content-Type': 'image/*'
            })
            .send(res.code);
    })

   
    // DELETE ALL FOR DEVELOPMENT REASONS

    server.get('/deleteAllData', async (req, res) => {
        await database.dropDatabase();

        res.status(200).send("Database borrada correctamente");
    })

    // POPULATE RESERVATIONS DATABASE

    server.get('/populateDatabase', async (req, res) => {
        const table = 
            [
                {
                    "id": 2,
                    "status": "Available",
                    "size": 4
                },
                {
                    "id": 3,
                    "status": "Reserved",
                    "size": 8,
                    "name": "Perico de los Palotes"
                },
                {
                    "id": 4,
                    "status": "Taken",
                    "size": 6,
                    "name": "Quasimodo"
                },
                {
                    "id": 5,
                    "status": "Taken",
                    "size": 5,
                    "name": "Nombre ejemplo 5"
                },
                {
                    "id": 6,
                    "status": "Reserved",
                    "size": 9,
                    "name": "María Salmiento"
                },
                {
                    "id": 7,
                    "status": "Available",
                    "size": 6
                }
            ];
        await database.collection('reservations').insertMany(table);
        
        const cartaCategories = [{ name: "Entrantes", items: [] }, { name: "Carnes", items: [] }, { name: "Pescados", items: [] }];
        await database.collection('carta').insertMany(cartaCategories);

        const cartaItemsEntrantes = [{name: "carne con patatas" , price: 11.99, photo: "1.png"},
        {name: "patatas bacon y queso" , price: 16.99, photo: "1.png"},
        {name: "pate la piara" , price: 12.99, photo: "1.png"},
        {name: "bolitas de queso y jamón" , price: 15.99, photo: "1.png"}];
        const cartaItemsCarnes = [{ name: "carne con patatas" , price: 11.99, photo: "1.png"},
        {name: "carne de ternera" , price: 16.99, photo: "1.png"},
        {name: "carne de cerdo" , price: 12.99, photo: "1.png"},
        {name: "carne de angus" , price: 15.99, photo: "1.png"}];
        const cartaItemsPescados = [{name: "carne con patatas" , price: 11.99, photo: "1.png"},
        {name: "caviar ruso" , price: 16.99, photo: "1.png"},
        {name: "dorada en salsa" , price: 12.99, photo: "1.png"},
        {name: "lubina al horno" , price: 15.99, photo: "1.png"}];

        await database.collection('carta').updateOne({ name : "Entrantes" }, { $addToSet: { items: { $each: cartaItemsEntrantes } } });
        await database.collection('carta').updateOne({ name : "Carnes" }, { $addToSet: { items: { $each: cartaItemsCarnes } } });
        await database.collection('carta').updateOne({ name : "Pescados" }, { $addToSet: { items: { $each: cartaItemsPescados } } });

        res
            .status(200)
            .headers({ 'content-type': 'application/json' })
            .send(cartaCategories);
    })

    server.get('/reservations', async (req, res) => {
        const allReservations = await database
            .collection('reservations')
            .find({}).project({ _id: 0})
            .toArray();

        res
            .status(200)
            .send(allReservations);
    })

    server.get('/takenReservations', async (req, res) => {
        const allReservations = await database
            .collection('reservations')
            .find({ $or: [{ status: 'Reserved'}, { status: 'Taken'}]}).project({ _id: 0})
            .toArray();

        res
            .status(200)
            .send(allReservations);
    })

    server.post<{ Body: NewTableType }>('/reservations/new', async (req, res) => {
        const tableInfo = req.body;
        
        const newId = await database.collection('reservations').countDocuments() + 1;
        const bod = {
            id: newId,
            status: 'Available',
            size: tableInfo.size
        }
        await database.collection('reservations').insertOne(bod);

        res
            .status(200)
            .headers({ 'content-type': 'application/json' })
            .send(bod);
    })

    server.put<{ Body: Table }>('/reservations/update', async (req, res) => {
        const tableModify = req.body;

        if((await database.collection('reservations').find({id: tableModify.id}).toArray()).length > 0){
            await database.collection('reservations').replaceOne({ id: tableModify.id }, tableModify);
            res
                .status(200)
                .headers({ 'content-type': 'application/json' })
                .send(tableModify);
        } else {
            res
                .status(200)
                .send("Reserva no encontrada");
        }
    })


    //////////////////

    server.get('/carta', async (req, res) => {
        const carta = await database
            .collection('carta')
            .find({ })
            .toArray();
        
        res
            .status(200)
            .send(carta);
    })

    server.get('/cartaCategories', async (req, res) => {
        const carta = await database
            .collection('carta')
            .distinct("name");
        
        res
            .status(200)
            .send(carta);
    })

    server.get('/carta/:category', async (req: FastifyRequest<{ Params: { category: string } }>, res) => {
        const carta = await database
            .collection('carta')
            .find({ name: req.params.category })
            .toArray();
        
        res
            .status(200)
            .send(carta);
    })


    server.post<{ Body: ItemInsert}>('/carta/new', async (req, res) => {
        const itemInsert = req.body;
        console.log(itemInsert);
        // Seleccionamos la colección, actualizamos la categoría por nombre y hacemos push de el/los items a la cat items
        await database.collection('carta').updateOne({ name : itemInsert.name }, { $push: { items: itemInsert.items } });

        res
            .status(200)
            .send(itemInsert);
    })

    server.post<{ Body: NewCategory}>('/carta/newCategory', async (req, res) => {
        const catInsert = req.body;

        await database.collection('carta').insertOne({ name : catInsert.name, items: [] })

        res
            .status(200)
            .send(catInsert);
    })

    server.put<{ Body: Item}>('/carta/update', async (req, res) => {
        const itemModify = req.body;

        // Seleccionamos la colección, y especificamos que los que tengan dentro de ITEMS el ID especificado, seteamos el nuevo nombre y precio
        await database.collection('carta').updateOne({ "items.id": itemModify.id }, { $set: { "items.$.name": itemModify.name, "items.$.price": itemModify.price }});

        res
            .status(200)
            .send(itemModify);
    })

    server.delete<{ Body: { id: number}}>('/carta/delete', async (req, res) => {
        const itemDelete = req.body.id;

        if((await database.collection('carta').find({ "items.id": itemDelete }).toArray()).length > 0){
            await database.collection('carta').updateOne({ "items.id": itemDelete }, { $pull: { items: { id: itemDelete}}});
            res
                .status(200)
                .send(itemDelete);
        } else {
            res.status(200).send("Item not found");
        }
    })

    /////////////////////////////

    server.get('/orders', async (req, res) => {
        const allOrders = await database.collection('orders').find({ }).toArray();

        res
            .status(200)
            .send(allOrders);
    })

    server.get('/orders/:orderid', async (req: FastifyRequest<{ Params: { orderid: string } }>, res) => {
        const selectedOrder = new ObjectId(req.params.orderid);

        const thisOrder = await database.collection('orders').findOne({ _id: selectedOrder });

        res
            .status(200)
            .send(thisOrder);
    })

    server.post<{ Body: OrderRequest }>('/orders/new', async (req, res) => {
        const order = req.body;
        let totalCost = 0;
        order.items.map(item => totalCost += item.price);
        const defOrder = {...order, totalCost: totalCost.toFixed(2)}

        await database.collection('orders').insertOne(defOrder);
        res
            .status(200)
            .send(order);
    })

    server.put<{ Body: Order }>('/orders/update', async (req, res) => {
        const orderUpdate = req.body;

        if((await database.collection('orders').find({ id: orderUpdate._id }).toArray()).length > 0){
            await database.collection('orders').updateOne({ id: orderUpdate._id }, { $set: { name: orderUpdate.name, items: orderUpdate.items }})

            res
                .status(200)
                .send(orderUpdate);
        } else {
            res
                .status(200)
                .send("Order not found")
        }
    })

    server.delete<{ Body: { id: ObjectId }}>('/orders/delete', async (req, res) => {
        const orderPaid = req.body.id;

        if(await database.collection('orders').countDocuments({ _id: orderPaid }, { limit: 1})){
            const selectedOrder = await database.collection('orders').findOne({ _id: orderPaid });
            if(selectedOrder){
                if('totalCost' in selectedOrder){
                    const { totalCost } = selectedOrder;
                    await database.collection('orderHistory').insertOne(selectedOrder);

                    const todaysDate = new Date().toISOString().slice(0, 10);
                    await database.collection('dailyData').updateOne(
                        { date: todaysDate },
                        {
                            $setOnInsert: { dailyIncome: { $push: {totalCost}}}
                        },
                        { upsert: true }
                    );

                    await database.collection('orders').findOneAndDelete({ _id: orderPaid });

                    res
                        .status(200)
                        .send(orderPaid)
                }
            }
        } else {
            res
                .status(200)
                .send(`Order ${orderPaid} not found.`)
        }
    })

    server.get('/dailyData', async (req, res) => {

        const dailyData = await database.collection('dailyData').find({}).toArray();

        res
            .status(200)
            .send(dailyData);
    })


    return server;
}
