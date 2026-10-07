import { type ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import type { ClientDetails } from '@shared/interfaces/client-details.interface.js';

const MAX_USER_AGENT_LENGTH = 512;

export function readClientInfo(
  request: Pick<Request, 'ip' | 'headers'>,
): ClientDetails {
  const userAgent = request.headers['user-agent'];
  return {
    // Behind the proxy, req.ip is the client thanks to `trust proxy`.
    ipAddress: request.ip ?? null,
    userAgent:
      typeof userAgent === 'string'
        ? userAgent.slice(0, MAX_USER_AGENT_LENGTH)
        : null,
  };
}

export const ClientInfo = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ClientDetails =>
    readClientInfo(context.switchToHttp().getRequest<Request>()),
);
