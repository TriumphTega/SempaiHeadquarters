// Retired: this endpoint moved money or settings without checking the caller
// and nothing in the app or website uses it any more.
import { gone } from "@/app/api/_lib/guard";

export const GET = gone;
export const POST = gone;
export const PUT = gone;
export const PATCH = gone;
export const DELETE = gone;
