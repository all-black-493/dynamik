import { NextRequest, NextResponse } from "next/server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export async function POST(req: NextRequest) {
    try {
        const { url, token } = await req.json();

        // Try https://mcp.sanity.io
        // Token being skyE0WSx6BR5LsVMDUZ1MsIKnSElPJUGbUcdSEDdzVW1Ae9uy4Fk8J7i8PlDS5sQfEDeOIPV87dH5pRoEvabnsEb7fcVEpVR0Ch9CMK58kE8gHEXFuEQipwTxwkIPFXTmrf8tHf945k06aIPrLHZKbKkquPXuHbbE3xHVJ15uiFAGk3zIh8x

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        const transport = new StreamableHTTPClientTransport(new URL(url), {
            requestInit: {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            },
        });

        const client = new Client(
            { name: "workflow-discovery", version: "1.0.0" },
            {
                capabilities: {
                    sampling: {
                        tools: {}
                    }
                }
            }
        );

        await client.connect(transport);
        const result = await client.listTools();

        await transport.close();

        return NextResponse.json({
            tools: result.tools || [],
        });

    } catch (error) {
        if (error instanceof Error) {
            console.error("MCP Discovery Error:", error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }
        throw error;
    }
}