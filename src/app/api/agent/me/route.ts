import { NextResponse } from "next/server";
import { getAgentUser } from "@/lib/agents/agent-auth";

export async function GET() {
  const agent = await getAgentUser();
  if (!agent) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  
  return NextResponse.json({
    agent: {
      id: agent.id,
      name: agent.name,
      email: agent.email,
      phone: agent.phone,
      agency: agent.agency,
    },
  });
}
