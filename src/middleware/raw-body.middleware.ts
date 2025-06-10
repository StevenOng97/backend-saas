import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export interface RawBodyRequest<T> extends Request {
  rawBody: Buffer;
}

@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  use(req: RawBodyRequest<Request>, res: Response, next: NextFunction) {
    if (req.originalUrl.includes('/webhook')) {
      let data = '';
      req.setEncoding('utf8');
      
      req.on('data', (chunk) => {
        data += chunk;
      });
      
      req.on('end', () => {
        req.rawBody = Buffer.from(data, 'utf8');
        next();
      });
    } else {
      next();
    }
  }
}