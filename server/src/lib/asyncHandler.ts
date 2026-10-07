import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Express 4 does not catch rejections from async route handlers — an thrown
 * error inside an `async (req, res)` handler escapes the router and crashes
 * the whole process. Wrap every async handler with this so errors flow to the
 * central error middleware instead.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
