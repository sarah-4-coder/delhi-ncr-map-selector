import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Area from "@/lib/models/areaModel";

export async function GET(request: Request) {
  try {
    console.log("Attempting to connect to database...");
    await dbConnect();
    console.log("Database connected successfully");

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "UserId is required" },
        { status: 400 }
      );
    }

    console.log("Fetching areas for userId:", userId);
    const areas = await Area.find({ userId });
    console.log("Areas fetched successfully:", areas.length);

    return NextResponse.json(areas);
  } catch (error) {
    console.error("Error in GET /api/areas:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    console.log("Attempting to connect to database...");
    await dbConnect();
    console.log("Database connected successfully");

    const body = await request.json();
    console.log("Received POST request with body:", body);

    if (!body.name || !body.coordinates || !body.userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log("Creating new area...");
    const area = await Area.create(body);
    console.log("Area created successfully:", area);

    return NextResponse.json(area, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/areas:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    console.log("Attempting to connect to database...");
    await dbConnect();
    console.log("Database connected successfully");

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Area ID is required" },
        { status: 400 }
      );
    }

    console.log("Deleting area with id:", id);
    const deletedArea = await Area.findByIdAndDelete(id);
    
    if (deletedArea) {
      console.log("Area deleted successfully:", deletedArea);
      return NextResponse.json({ success: true });
    } else {
      console.log("Area not found for deletion");
      return NextResponse.json({ error: "Area not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Error in DELETE /api/areas:", error);
    return NextResponse.json(
      { error: "Failed to delete area", details: error.message },
      { status: 500 }
    );
  }
}