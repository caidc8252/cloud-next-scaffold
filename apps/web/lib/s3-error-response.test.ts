import { describe, expect, it } from "vitest";
import { s3ErrorResponse } from "./s3-error-response";

async function readBody(response: Response) {
  return (await response.json()) as {
    code: string;
    message: string;
    traceId: string;
  };
}

describe("s3ErrorResponse", () => {
  it("maps invalid AWS session tokens to credential errors", async () => {
    const error = Object.assign(
      new Error("The security token included in the request is invalid"),
      {
        name: "InvalidClientTokenId",
        $metadata: { httpStatusCode: 403 },
      },
    );

    const response = s3ErrorResponse(error);
    const body = await readBody(response);

    expect(response.status).toBe(401);
    expect(body.code).toBe("storage.aws_credentials_invalid");
  });

  it("maps missing S3 objects to not found errors", async () => {
    const error = Object.assign(new Error("The specified key does not exist."), {
      name: "NoSuchKey",
      $metadata: { httpStatusCode: 404 },
    });

    const response = s3ErrorResponse(error);
    const body = await readBody(response);

    expect(response.status).toBe(404);
    expect(body.code).toBe("storage.s3_object_not_found");
  });
});
