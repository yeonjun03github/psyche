import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = isHttpException ? exception.getResponse() : null;

    if (!isHttpException) {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    const meta = { statusCode: status, path: request.url, timestamp: new Date().toISOString() };

    // Terminus 헬스체크 등 body가 구조화된 객체인 예외는 그 내용(예: 어떤 서비스가 왜
    // 죽었는지)을 그대로 보존한다 — 단순 message 문자열로 뭉개면 원인을 알 수 없게 된다.
    if (body && typeof body === 'object') {
      response.status(status).json({ ...body, ...meta });
      return;
    }

    const message = typeof body === 'string' ? body : '서버 오류가 발생했습니다.';
    response.status(status).json({ ...meta, message });
  }
}
