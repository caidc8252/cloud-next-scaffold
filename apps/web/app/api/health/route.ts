import { successResponse } from "@cloud/request/server";

export async function GET() {
  return successResponse({
    ok: true,
    service: "web",
  });
}
