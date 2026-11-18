import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common";
import { Prisma } from "../generated/prisma/client";

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientInitializationError,
)
export class DatabaseFilter implements ExceptionFilter {
  catch(_error: unknown, host: ArgumentsHost): void {
    host.switchToHttp().getResponse().status(503).json({
      statusCode: 503,
      message: "The data connection is unavailable. Please retry.",
    });
  }
}
