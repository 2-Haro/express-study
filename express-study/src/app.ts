import 'reflect-metadata';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3';
import { DataSource } from 'typeorm';
import { User } from './entities/user';

const app: Application = express(); // express를 함수처럼 호출해서 return된 값을 app에 넣는다

export const AppDataSource = new DataSource({
  type: 'sqlite', // DB로 sqlite 사용
  database: 'database.sqlite', // typeorm이 접근할 DB 이름
  synchronize: true, // 변경사항이 생기는 대로 DB에 적용
  logging: false, // query와 error에 대한 logging을 하지 않는다
  entities: ['src/entities/*.ts'], // Glob Pattern 사용해서 경로 명시 -> entitiy: class that maps to a database table
  migrations: ['src/migrations/**/*.ts'], // Glob Pattern 사용해서 경로 명시 -> list of migrations need to be loaded by TypeORM
  subscribers: ['src/subscribers/**/*.subscriber.ts'], // Glob Pattern 사용해서 경로 명시 -> Subscribers to be loaded and used for this data source.
});

AppDataSource.initialize() // initialize
  .then(() => {
    console.log('Data Source has been initialized!');
  })
  .catch((err) => {
    console.error('Error during Data Source initialization:', err);
  });

const db = new sqlite3.Database('./db/my.db', sqlite3.OPEN_READWRITE, (err) => {
  // db 초기화
  if (err) {
    console.error(err.message);
  } else {
    console.log('Connected to the mydb database.');
  }
});

const dropQuery = `
  DROP TABLE IF EXISTS person
`; // person table이 있다면 삭제
const insertQuery = `
  CREATE TABLE IF NOT EXISTS person(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(20)
  )
`; // person table이 없으면 생성
// const dummyDataQuery = `
//   insert into person(name) values ('hi'), ('hello')
// `;

db.serialize(() => {
  db.each(dropQuery); // db.each(): query 실행(각각의 결과 handling)
  db.each(insertQuery);
});

app.use(cors()); // express app에서 CORS 설정
// express app에서 bodyParser 설정 // POST와 PUT 메서드의 request.body 값에 접근해서 읽을 수 있도록 한다 -> API 요쳉에서 받은 body 값을 파싱하는 역할을 수행
app.use(bodyParser.urlencoded({ extended: false })); // .urlencoded: application/x-www-form-urlencoded 방식의 Content-Type(HTML form의 기본 Content-Type) 데이터를 받아준다 // extended: 중첩된 객체 표현 허용 여부 -> false인 경우 node.js에 기본으로 내장된 query-string 모듈(URL-encoded data 파싱) 사용
app.use(bodyParser.json()); // application/json 방식(json 형식, RESTFUL API 사용)의 Content-Type 데이터를 받아준다

// app.get('/', async (req: Request, res: Response) => {
//   const query = `SELECT * FROM person`;
//   db.serialize();
//   new Promise((resolve) =>
//     db.all(query, (err, rows) => {
//       if (err) console.log(err);
//       return resolve(rows);
//     }),
//   ).then((rows) =>
//     res.status(200).send({
//       user: rows,
//     }),
//   );
// });

app.get('/', async (req: Request, res: Response) => {
  const users = await AppDataSource.getRepository(User).find();
  res.json(users);
});

// app.post('/', async (req: Request, res: Response): Promise<Response> => {
//   const query = `insert into person(name) values ('${req.body.name}')`;
//   db.serialize();
//   db.each(query);
//   return res.status(200).send(); // res.send(body) -> 클라이언트에 응답을 보낸다(status code는 옵션)
// });

app.post('/', async (req: Request, res: Response): Promise<Response> => {
  const user = await AppDataSource.getRepository(User).create(req.body);
  const results = await AppDataSource.getRepository(User).save(user);
  return res.send(results);
});

const PORT = 3000; // PORT 선언: http://localhost:3000/

try {
  app.listen(PORT, (): void => {
    // app.listen() -> 포트번호(3000)와 리스닝이 성공했을 때 실행될 콜백 함수 작성 // 콜백 함수: 다른 함수의 인자로써 이용되는 함수 or 어떤 이벤트에 의해 호출되어지는 함수
    console.log(`Connected successfully on port ${PORT}`);
  });
} catch (error: any) {
  // 예외 처리(에러)
  console.error(`Error occured: ${error.message}`); // 에러 출력
}
