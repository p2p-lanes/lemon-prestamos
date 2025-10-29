/**
 * POST /api/debug/log
 * Endpoint to receive logs from frontend for debugging
 */

import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { level, message, data, timestamp } = await request.json();

    // Format log output for Vercel logs
    const logPrefix = `[FRONTEND ${level?.toUpperCase() || 'LOG'}]`;
    const logMessage = `${logPrefix} ${message}`;

    // Log to console (visible in Vercel function logs)
    if (level === "error") {
      console.error(logMessage, data ? JSON.stringify(data, null, 2) : '');
    } else if (level === "warn") {
      console.warn(logMessage, data ? JSON.stringify(data, null, 2) : '');
    } else {
      console.log(logMessage, data ? JSON.stringify(data, null, 2) : '');
    }

    return NextResponse.json({
      success: true,
      logged: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[DEBUG API] Error processing log:", error);
    return NextResponse.json(
      { error: "Failed to process log" },
      { status: 500 }
    );
  }
}
