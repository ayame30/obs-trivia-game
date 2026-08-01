import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import chalk from 'chalk';
import { AppModule } from './app.module';
import { ScoreboardService } from './scoreboard/scoreboard.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true });

  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);

  const base = `http://localhost:${port}`;
  console.log(chalk.green('--------------------------------'));
  console.log(chalk.green('Successfully started Obs Trivia game'));
  console.log(chalk.green('--------------------------------'));
  console.log(chalk.green(`Obs Trivia game: ${base}`));
  console.log(chalk.green(`Overlays: http://localhost:${port}/overlay`));
  console.log(chalk.green(`Scoreboard Overlays: http://localhost:${port}/scoreboard-overlay`));
  console.log(chalk.blue('--------------------------------'));

  const scoreboardService = app.get(ScoreboardService);
  const scoreboard = await scoreboardService.findEntities();
  if (scoreboard.length === 0) {
    console.log(chalk.yellow('Scoreboard is empty.'));
  } else {
    console.log(chalk.cyan('Current Scoreboard:'));
    scoreboard.forEach((entry, idx) => {
      console.log(
        chalk.whiteBright(
          `${idx + 1}. ${entry.displayName} (${entry.twitchUserId}): ${entry.score} points`
        )
      );
    });
  }

  console.log(chalk.grey('--------------------------------'));
  console.log(chalk.grey('To stop the server, press Ctrl+C'));
}

bootstrap();
