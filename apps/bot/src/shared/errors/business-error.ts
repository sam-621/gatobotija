import { AppError } from './app-error';

export class BusinessError<Code extends string = string> extends AppError {
  constructor(
    readonly code: Code,
    message: string
  ) {
    super(message);
  }
}
