import 'reflect-metadata';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { DataSource } from 'typeorm';
import { Game, Question } from './entities/game';

const app: Application = express();

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: 'database.sqlite',
  synchronize: true,
  logging: false,
  entities: ['src/entities/*.ts'],
});

AppDataSource.initialize()
  .then(() => {
    console.log('Data Source has been initialized!');
  })
  .catch((err) => {
    console.error('Error during Data Source initialization:', err);
  });

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/new', async (req: Request, res: Response) => {
  try {
    const game = await AppDataSource.getRepository(Game).create({ title: req.body.title }); // Game에 대한 정보(title)
    const result = await AppDataSource.getRepository(Game).save(game);

    await Promise.all(
      req.body.questions.map(async (question: Question) => {
        const q = await AppDataSource.getRepository(Question).create({
          // Question에 대한 정보
          content: question.content,
          options: JSON.stringify(question.options),
          index: question.index,
          count: 0,
          game: result,
        });
        await AppDataSource.getRepository(Question).save(q);
      }),
    );
    return res.send(result);
  } catch (e) {
    console.log(e);
  }
});

app.get('/game/:gameId', async (req: Request, res: Response) => {
  try {
    const game = await AppDataSource.getRepository(Game)
      .createQueryBuilder('game')
      .where('game.id = :id', { id: req.params.gameId })
      .leftJoinAndSelect('game.questions', 'qustions')
      .getOne();

    if (!game) return res.send(404);

    return res.send({
      title: game.title,
      questions: game.questions.map((question) => {
        return {
          id: question.id,
          index: question.index,
          content: question.content,
          options: JSON.parse(question.options),
        };
      }),
    });
  } catch (e) {
    console.log(e);
  }
});

app.get('/game/:gameId/:index', async (req: Request, res: Response) => {
  try {
    const game = await AppDataSource.getRepository(Game)
      .createQueryBuilder('game')
      .where('game.id = :id', { id: req.params.gameId })
      .leftJoinAndSelect('game.questions', 'questions')
      .getOne();

    if (!game) return res.send(404);

    const questionId = game.questions[parseInt(req.params.index)].id;
    const count = game.questions[parseInt(req.params.index)].count;

    await AppDataSource.getRepository(Question).update(questionId, { count: () => 'count + 1' });

    return res.send({ count: count + 1 });
  } catch (e) {
    console.log(e);
  }
});

const PORT = 3001;

try {
  app.listen(PORT, (): void => {
    console.log(`Connected successfully on port ${PORT}`);
  });
} catch (error: any) {
  console.error(`Error occured: ${error.message}`);
}
