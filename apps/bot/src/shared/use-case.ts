import { z } from 'zod';

import { InvalidInputError } from './errors/invalid-input-error';

type RunOutput<T extends { run: (...args: never[]) => unknown }> = Awaited<ReturnType<T['run']>>;

export abstract class UseCase<Schema extends z.ZodType> {
  constructor(private readonly schema: Schema) {}

  async execute(input: z.input<Schema>): Promise<RunOutput<this> | InvalidInputError> {
    const result = this.schema.safeParse(input);

    if (!result.success) return new InvalidInputError(z.prettifyError(result.error));

    return (await this.run(result.data)) as RunOutput<this>;
  }

  abstract run(input: z.output<Schema>): Promise<unknown>;
}
