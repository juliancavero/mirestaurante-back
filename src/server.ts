import fastify, {
  FastifyInstance,
  FastifyRequest /* FastifySchema */,
} from "fastify";
import type { Logger } from "pino";
import { NOSQL_DB } from "./databases/mongo-db";
import fastifyCors from "fastify-cors";
import { ObjectId } from "mongodb";
import multer from "fastify-multer";
import fastifyJwt from "@fastify/jwt";
import path from "path";

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
  status: "Available" | "Taken" | "Reserved";
  size: number;
  name?: string;
};

type NewTableType = {
  size: number;
};

export type CartaType = Categoria[];

export type Categoria = {
  name: string;
  items: Item[];
};
export type NewCategory = {
  name: string;
};
export type ItemInsert = {
  name: string;
  items: ItemSendType;
};

export type Item = {
  id: string;
  name: string;
  price: number;
  photo: string;
};

export type ItemSendType = {
  name: string;
  price: number;
  photo: string;
  quantity: number;
};

type Order = {
  _id: ObjectId;
  name: string;
  items: Item[];
};
type OrderRequest = {
  name: string;
  tableId: number;
  items: ItemSendType[];
};

export type ServerDeps = {
  logger: Logger;
  dbNoSql: NOSQL_DB;
};

type DailyIncomeData = {
  date: string;
  totalIncome: number[];
};

type PutNewPassword = {
  key: string;
};

type Employee = {
  name: string;
  role: "Waiter" | "Manager" | "Owner";
  payslip: number;
  userName: string;
  dni: string;
};

type User = {
  userName: string;
  password: string;
};

type RegisterUser = {
  name: string;
  userName: string;
  password: string;
  dni: string;
  secretKey: string;
};

type DeleteTableType = {
  id: number;
};

type DeleteEmployeeType = {
  userName: string;
};

export function buildServer({ logger, dbNoSql }: ServerDeps): FastifyInstance {
  const server = fastify({ logger });
  const database = dbNoSql.getDatabase();

  const storage = multer.diskStorage({
    destination: function (req, file, callback) {
      callback(null, path.join(__dirname, "../public/images/"));
    },
    filename: function (req, file, callback) {
      callback(null, file.originalname);
    },
  });

  const upload = multer({ storage: storage });

  // CORS

  server.register(fastifyCors, {
    origin: "*",
    methods: "GET,PUT,POST,DELETE",
    allowedHeaders: ["Content-Type"],
  });

  // IMAGENES

  server.register(multer.contentParser);

  server.post(
    "/cartaItemPhoto",
    { preHandler: upload.single("cartaItemPhoto") },
    function (req, res) {
      res
        .code(200)
        .headers({
          "Content-Type": "image/*",
        })
        .send(res.code);
    }
  );

  // AUTH TOKEN

  server.register(fastifyJwt, {
    secret: "estoesmuysecreto",
  });

  // DELETE ALL FOR DEVELOPMENT REASONS

  server.get("/deleteAllData", async (req, res) => {
    await database.dropDatabase();

    res.status(200).send("Database borrada correctamente");
  });

  server.get("/reservations", async (req, res) => {
    const allReservations = await database
      .collection("reservations")
      .find({})
      .project({ _id: 0 })
      .toArray();

    res.status(200).send(allReservations);
  });

  server.delete<{ Body: DeleteTableType }>(
    "/reservations",
    async (req, res) => {
      const idTableDelete = req.body.id;
      await database
        .collection("reservations")
        .findOneAndDelete({ id: idTableDelete });

      res.status(200).send({ idTableDelete });
    }
  );

  server.get("/takenReservations", async (req, res) => {
    const allReservations = await database
      .collection("reservations")
      .find({ $or: [{ status: "Reserved" }, { status: "Taken" }] })
      .project({ _id: 0 })
      .toArray();

    res.status(200).send(allReservations);
  });

  server.post<{ Body: NewTableType }>("/reservations/new", async (req, res) => {
    const tableInfo = req.body;

    const newId =
      (await database.collection("reservations").countDocuments()) + 1;
    const bod = {
      id: newId,
      status: "Available",
      size: tableInfo.size,
    };
    await database.collection("reservations").insertOne(bod);

    res.status(200).headers({ "content-type": "application/json" }).send(bod);
  });

  server.put<{ Body: Table }>("/reservations/update", async (req, res) => {
    const tableModify = req.body;

    if (
      (
        await database
          .collection("reservations")
          .find({ id: tableModify.id })
          .toArray()
      ).length > 0
    ) {
      await database
        .collection("reservations")
        .replaceOne({ id: tableModify.id }, tableModify);
      res
        .status(200)
        .headers({ "content-type": "application/json" })
        .send(tableModify);
    } else {
      res.status(200).send("Reserva no encontrada");
    }
  });

  server.get("/", (req, res) => {
    res.status(200).send("Backend Working correctly");
  });

  //////////////////

  server.get("/carta", async (req, res) => {
    const carta = await database.collection("carta").find({}).toArray();

    res.status(200).send(carta);
  });

  server.get("/cartaCategories", async (req, res) => {
    const carta = await database.collection("carta").distinct("name");

    res.status(200).send(carta);
  });

  server.get(
    "/carta/:category",
    async (req: FastifyRequest<{ Params: { category: string } }>, res) => {
      const carta = await database
        .collection("carta")
        .find({ name: req.params.category })
        .toArray();

      res.status(200).send(carta);
    }
  );

  server.post<{ Body: ItemInsert }>("/carta/new", async (req, res) => {
    const itemInsert = req.body;
    console.log(itemInsert);
    // Seleccionamos la colección, actualizamos la categoría por nombre y hacemos push de el/los items a la cat items
    await database
      .collection("carta")
      .updateOne(
        { name: itemInsert.name },
        { $push: { items: itemInsert.items } }
      );

    res.status(200).send(itemInsert);
  });

  server.post<{ Body: NewCategory }>("/carta/newCategory", async (req, res) => {
    const catInsert = req.body;

    await database
      .collection("carta")
      .insertOne({ name: catInsert.name, items: [] });

    res.status(200).send(catInsert);
  });

  server.put<{ Body: Item }>("/carta/update", async (req, res) => {
    const itemModify = req.body;

    // Seleccionamos la colección, y especificamos que los que tengan dentro de ITEMS el ID especificado, seteamos el nuevo nombre y precio
    await database.collection("carta").updateOne(
      { "items.id": itemModify.id },
      {
        $set: {
          "items.$.name": itemModify.name,
          "items.$.price": itemModify.price,
        },
      }
    );

    res.status(200).send(itemModify);
  });

  server.delete<{ Body: { name: string } }>(
    "/carta/deleteItem",
    async (req, res) => {
      const itemDelete = req.body.name;

      if (
        (
          await database
            .collection("carta")
            .find({ "items.name": itemDelete })
            .toArray()
        ).length > 0
      ) {
        await database
          .collection("carta")
          .updateOne(
            { "items.name": itemDelete },
            { $pull: { items: { name: itemDelete } } }
          );
        res.status(200).send({ itemDelete });
      } else {
        res.status(400).send("Item not found");
      }
    }
  );

  server.delete<{ Body: { name: string } }>(
    "/carta/deleteCategory",
    async (req, res) => {
      const categoryDelete = req.body.name;

      if (
        (
          await database
            .collection("carta")
            .find({ name: categoryDelete })
            .toArray()
        ).length > 0
      ) {
        await database
          .collection("carta")
          .findOneAndDelete({ name: categoryDelete });
        res.status(200).send({ categoryDelete });
      } else {
        res.status(400).send("Category not found");
      }
    }
  );

  /////////////////////////////

  server.get("/orders", async (req, res) => {
    const allOrders = await database.collection("orders").find({}).toArray();

    res.status(200).send(allOrders);
  });

  server.get(
    "/orders/:orderid",
    async (req: FastifyRequest<{ Params: { orderid: string } }>, res) => {
      const selectedOrder = new ObjectId(req.params.orderid);

      const thisOrder = await database
        .collection("orders")
        .findOne({ _id: selectedOrder });

      res.status(200).send(thisOrder);
    }
  );

  server.post<{ Body: OrderRequest }>("/orders/new", async (req, res) => {
    const order = req.body;
    let totalCost = 0;
    order.items.forEach((value) => (totalCost += value.price * value.quantity));
    const defOrder = { ...order, totalCost: totalCost };

    await database.collection("orders").insertOne(defOrder);
    res.status(200).send(order);
  });

  server.put<{ Body: Order }>("/orders/update", async (req, res) => {
    const orderUpdate = req.body;

    if (
      (
        await database
          .collection("orders")
          .find({ id: orderUpdate._id })
          .toArray()
      ).length > 0
    ) {
      await database
        .collection("orders")
        .updateOne(
          { id: orderUpdate._id },
          { $set: { name: orderUpdate.name, items: orderUpdate.items } }
        );

      res.status(200).send(orderUpdate);
    } else {
      res.status(200).send("Order not found");
    }
  });

  server.delete<{ Body: { tableId: number } }>(
    "/orders/delete",
    async (req, res) => {
      const orderTable = req.body.tableId;

      if (
        await database
          .collection("orders")
          .countDocuments({ tableId: orderTable }, { limit: 1 })
      ) {
        const selectedOrder = await database
          .collection("orders")
          .findOne({ tableId: orderTable });
        if (selectedOrder) {
          if ("totalCost" in selectedOrder) {
            const todaysDate = new Date().toISOString().slice(0, 10);
            const orderWithDate = {
              ...selectedOrder,
              date: todaysDate,
            };
            await database.collection("orderHistory").insertOne(orderWithDate);

            await database.collection("dailyData").updateOne(
              { date: todaysDate },
              {
                $push: {
                  totalIncome: parseFloat(
                    parseFloat(selectedOrder.totalCost).toFixed(2)
                  ),
                },
              },
              { upsert: true }
            );
            console.log(selectedOrder.totalCost);

            await database
              .collection("orders")
              .findOneAndDelete({ tableId: orderTable });

            await database
              .collection("reservations")
              .updateOne(
                { id: selectedOrder.tableId },
                { $set: { status: "Available" }, $unset: { name: "" } }
              );

            res.status(200).send(orderTable);
          }
        }
      } else {
        res.status(200).send(`Order ${orderTable} not found.`);
      }
    }
  );

  server.get("/orderHistory", async (req, res) => {
    const orderHistory = await database
      .collection("orderHistory")
      .find({})
      .toArray();

    res.status(200).send({ orderHistory });
  });

  server.get("/dailyData", async (req, res) => {
    const dailyData = (await database
      .collection("dailyData")
      .find({}, { projection: { _id: 0 } })
      .toArray()) as unknown as DailyIncomeData[];
    dailyData.forEach((each) => {
      const total = each.totalIncome.reduce(
        (partialSum, a) => partialSum + a,
        0
      );
      each.totalIncome = [total];
    });

    res.status(200).send({ dailyData });
  });

  server.put<{ Body: PutNewPassword }>("/newEmployeeKey", async (req, res) => {
    const newKey = req.body;
    await database
      .collection("secretKey")
      .findOneAndReplace(
        { key: { $exists: true } },
        { key: newKey },
        { upsert: true }
      );
    res.status(200).send({ newKey });
  });

  server.get("/newEmployeeKey", async (req, res) => {
    const actualKey = await database.collection("secretKey").findOne({});
    console.log(actualKey);
    if (actualKey && "key" in actualKey) {
      const key = actualKey.key;
      res.status(200).send({ key });
    } else {
      res.status(200).send({ key: "not_found" });
    }
  });

  server.get("/employees", async (req, res) => {
    const employees = await database.collection("employees").find({}).toArray();

    res.status(200).send(employees);
  });

  server.post<{ Body: Employee }>("/employees", async (req, res) => {
    const { name, role, payslip, userName, dni } = req.body;

    const found = await database.collection("employees").findOne({ dni: dni });
    if (!found) {
      await database.collection("employees").insertOne({
        name: name,
        role: role,
        payslip: payslip,
        userName: userName,
        dni: dni,
      });
      res.status(204).send();
    }
  });

  server.put<{ Body: Employee }>("/employees", async (req, res) => {
    const employeeDni = req.body.dni;

    if (await database.collection("employees").findOne({ dni: employeeDni })) {
      await database.collection("employees").updateOne(
        { dni: employeeDni },
        {
          $set: {
            name: req.body.name,
            role: req.body.role,
            payslip: req.body.payslip,
            userName: req.body.userName,
          },
        }
      );

      res.status(200).send({ employeeDni });
    } else {
      res.status(405).send({ employeeDni });
    }
  });

  server.delete<{ Body: DeleteEmployeeType }>(
    "/employees",
    async (req, res) => {
      const userNameDelete = req.body.userName;
      const exists = (
        await database
          .collection("employees")
          .findOneAndDelete({ userName: userNameDelete })
      ).ok;
      if (exists === 1) {
        await database
          .collection("users")
          .findOneAndDelete({ userName: userNameDelete });

        res.status(200).send({ userNameDelete });
      } else {
        res.status(400).send({ userNameDelete });
      }
    }
  );

  server.get("/users", async (req, res) => {
    const users = await database.collection("users").find({}).toArray();

    res.status(200).send(users);
  });
  server.post<{ Body: User }>("/login", async (req, res) => {
    const { userName, password } = req.body;

    const user = await database
      .collection("users")
      .findOne({ userName: userName, password: password });
    if (!user) return res.status(404).send({ userName });

    const employeeData = await database
      .collection("employees")
      .findOne({ userName: userName }, { projection: { role: 1 } });
    if (employeeData && "role" in employeeData) {
      const token = await res.jwtSign({
        userName: userName,
        role: employeeData.role,
      });

      return res.status(200).send({ token });
    }
    return res.status(405).send({ userName });
  });

  server.post<{ Body: RegisterUser }>("/register", async (req, res) => {
    const { name, userName, password, dni, secretKey } = req.body;
    const confirmationKey = (await database
      .collection("secretKey")
      .findOne({}, { projection: { _id: 0 } })) as unknown as {
      key: string;
    };
    if (secretKey !== confirmationKey.key) {
      console.log(secretKey, confirmationKey.key);
      return res.status(403).send({ secretKey });
    }
    const existingUser = await database
      .collection("users")
      .countDocuments({ userName: userName });
    if (existingUser !== 0) {
      return res.status(405).send({ userName });
    }
    await database
      .collection("users")
      .insertOne({ userName: userName, password: password, dni: dni });

    await database.collection("employees").insertOne({
      name: name,
      role: "Waiter",
      payslip: 12000,
      userName: userName,
      dni: dni,
    });

    return res.status(200).send({ dni });
  });

  server.get("/generateTestUsers", async (req, res) => {
    const testEmployees = [
      {
        name: "admin",
        role: "Owner",
        payslip: 99999,
        userName: "admin",
        dni: "12345678A",
      },
      {
        name: "camarero",
        role: "Waiter",
        payslip: 12000,
        userName: "camarero",
        dni: "23456789B",
      },
      {
        name: "manager",
        role: "Manager",
        payslip: 18000,
        userName: "manager",
        dni: "34567890C",
      },
    ];
    const testUsers = [
      {
        userName: "admin",
        password: "admin",
        dni: "12345678A",
      },
      {
        userName: "camarero",
        password: "camarero",
        dni: "23456789B",
      },
      {
        userName: "manager",
        password: "manager",
        dni: "34567890C",
      },
    ];
    const testDailyData = [
      {
        date: "2022-06-04",
        totalIncome: [108],
      },
      {
        date: "2022-06-05",
        totalIncome: [35.4],
      },
      {
        date: "2022-06-06",
        totalIncome: [73],
      },
      {
        date: "2022-06-07",
        totalIncome: [314.3],
      },
    ];
    const testCartaItems = [
      {
        name: "Entrantes",
        items: [
          { name: "Patatas fritas", price: 6.5, photo: "patatasfritas.jpg" },
          { name: "Patatas bravas", price: 7, photo: "patatasbravas.jpg" },
          { name: "Marinera", price: 1.5, photo: "marinera.jpg" },
          { name: "Ensalada césar", price: 9, photo: "ensaladacesar.jpg" },
        ],
      },
      {
        name: "Carnes",
        items: [
          { name: "Carne de pollo", price: 11, photo: "carnedepollo.jpg" },
          { name: "Carne de ternera", price: 15, photo: "ternera.jpg" },
          { name: "Cerdo a la plancha", price: 13.2, photo: "cerdo.jpg" },
          { name: "Solomillo", price: 19.9, photo: "solomillo.jpg" },
        ],
      },
      {
        name: "Pescados",
        items: [
          { name: "Lubina a la plancha", price: 10, photo: "lubina.jpg" },
          { name: "Dorada a la sal", price: 12, photo: "dorada.jpg" },
          { name: "Emperador", price: 17, photo: "emperador.jpg" },
          { name: "Sardinas rebozadas", price: 9, photo: "sardinas.jpg" },
        ],
      },
      {
        name: "Postres",
        items: [
          { name: "Tarta de la abuela", price: 5, photo: "tartaabuela.jpg" },
          { name: "Coulant de chocolate", price: 4, photo: "coulant.jpg" },
          { name: "Tarta de oreo", price: 7.5, photo: "oreo.jpg" },
          { name: "Helado de cookies", price: 6.33, photo: "helado.jpg" },
        ],
      },
    ];
    const testTables = [
      {
        id: 1,
        status: "Available",
        size: 4,
      },
      {
        id: 2,
        status: "Available",
        size: 4,
      },
      {
        id: 3,
        status: "Available",
        size: 2,
      },
      {
        id: 4,
        status: "Available",
        size: 2,
      },
      {
        id: 5,
        status: "Available",
        size: 6,
      },
      {
        id: 6,
        status: "Available",
        size: 6,
      },
      {
        id: 7,
        status: "Available",
        size: 5,
      },
      {
        id: 8,
        status: "Available",
        size: 10,
      },
      {
        id: 9,
        status: "Available",
        size: 10,
      },
      {
        id: 10,
        status: "Available",
        size: 8,
      },
      {
        id: 11,
        status: "Available",
        size: 8,
      },
      {
        id: 12,
        status: "Available",
        size: 4,
      },
      {
        id: 13,
        status: "Available",
        size: 2,
      },
      {
        id: 14,
        status: "Available",
        size: 2,
      },
    ];
    const testOrderHistory = [
      {
        name: "Marta Montesinos",
        tableId: 3,
        items: [
          {
            name: "Patatas bravas",
            price: 7,
            photo: "patatasbravas.jpg",
            quantity: 1,
          },
          {
            name: "Ensalada césar",
            price: 9,
            photo: "ensaladacesar.jpg",
            quantity: 1,
          },
          {
            name: "Carne de ternera",
            price: 15,
            photo: "ternera.jpg",
            quantity: 4,
          },
          {
            name: "Dorada a la sal",
            price: 12,
            photo: "dorada.jpg",
            quantity: 1,
          },
          {
            name: "Coulant de chocolate",
            price: 4,
            photo: "coulant.jpg",
            quantity: 5,
          },
        ],
        totalCost: 108,
        date: "2022-06-04",
      },
      {
        name: "Luis Cavero",
        tableId: 8,
        items: [
          {
            name: "Patatas fritas",
            price: 6.5,
            photo: "patatasfritas.jpg",
            quantity: 1,
          },
          {
            name: "Solomillo",
            price: 19.9,
            photo: "solomillo.jpg",
            quantity: 1,
          },
          {
            name: "Sardinas rebozadas",
            price: 9,
            photo: "sardinas.jpg",
            quantity: 1,
          },
        ],
        totalCost: 35.4,
        date: "2022-06-05",
      },
      {
        name: "José Pelaez",
        tableId: 10,
        items: [
          {
            name: "Ensalada césar",
            price: 9,
            photo: "ensaladacesar.jpg",
            quantity: 4.5,
          },
          {
            name: "Carne de ternera",
            price: 15,
            photo: "ternera.jpg",
            quantity: 1,
          },
          {
            name: "Lubina a la plancha",
            price: 10,
            photo: "lubina.jpg",
            quantity: 1,
          },
          {
            name: "Tarta de oreo",
            price: 7.5,
            photo: "oreo.jpg",
            quantity: 1,
          },
        ],
        totalCost: 73,
        date: "2022-06-06",
      },
      {
        name: "Marcos Salazar",
        tableId: 5,
        items: [
          {
            name: "Marinera",
            price: 1.5,
            photo: "marinera.jpg",
            quantity: 6,
          },
          {
            name: "Carne de ternera",
            price: 15,
            photo: "ternera.jpg",
            quantity: 6.5,
          },
          {
            name: "Emperador",
            price: 17,
            photo: "emperador.jpg",
            quantity: 8.5,
          },
          {
            name: "Helado de cookies",
            price: 6.33,
            photo: "helado.jpg",
            quantity: 10,
          },
        ],
        totalCost: 314.3,
        date: "2022-06-07",
      },
    ];

    await database.collection("orderHistory").insertMany(testOrderHistory);
    await database.collection("reservations").insertMany(testTables);
    await database.collection("carta").insertMany(testCartaItems);
    await database.collection("dailyData").insertMany(testDailyData);
    await database.collection("employees").insertMany(testEmployees);
    await database.collection("users").insertMany(testUsers);
    await database
      .collection("secretKey")
      .findOneAndReplace(
        { key: { $exists: true } },
        { key: "password" },
        { upsert: true }
      );
    res.status(200).send("Datos de ejemplo guardados en la base de datos.");
  });

  return server;
}
