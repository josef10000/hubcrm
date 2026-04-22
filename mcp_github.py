import asyncio
import os
import httpx
import base64
from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions, Server
from mcp.server.stdio import stdio_server
import mcp.types as types

# Servidor MCP para Bridge do GitHub
server = Server("github-bridge")

@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="github_get_repo",
            description="Obtém informações de um repositório do GitHub.",
            inputSchema={
                "type": "object",
                "properties": {
                    "owner": {"type": "string", "description": "Proprietário do repositório"},
                    "repo": {"type": "string", "description": "Nome do repositório"}
                },
                "required": ["owner", "repo"]
            }
        ),
        types.Tool(
            name="github_list_issues",
            description="Lista as issues de um repositório.",
            inputSchema={
                "type": "object",
                "properties": {
                    "owner": {"type": "string"},
                    "repo": {"type": "string"},
                    "state": {"type": "string", "enum": ["open", "closed", "all"], "default": "open"}
                },
                "required": ["owner", "repo"]
            }
        ),
        types.Tool(
            name="github_create_issue",
            description="Cria uma nova issue no GitHub.",
            inputSchema={
                "type": "object",
                "properties": {
                    "owner": {"type": "string"},
                    "repo": {"type": "string"},
                    "title": {"type": "string"},
                    "body": {"type": "string"}
                },
                "required": ["owner", "repo", "title"]
            }
        ),
        types.Tool(
            name="github_get_file_contents",
            description="Obtém o conteúdo de um arquivo do repositório.",
            inputSchema={
                "type": "object",
                "properties": {
                    "owner": {"type": "string"},
                    "repo": {"type": "string"},
                    "path": {"type": "string"}
                },
                "required": ["owner", "repo", "path"]
            }
        ),
        types.Tool(
            name="github_create_or_update_file",
            description="Cria ou atualiza um arquivo no repositório.",
            inputSchema={
                "type": "object",
                "properties": {
                    "owner": {"type": "string"},
                    "repo": {"type": "string"},
                    "path": {"type": "string"},
                    "message": {"type": "string"},
                    "content": {"type": "string"},
                    "sha": {"type": "string", "description": "SHA do arquivo (necessário para atualização)"}
                },
                "required": ["owner", "repo", "path", "message", "content"]
            }
        )
    ]

@server.call_tool()
async def handle_call_tool(name: str, arguments: dict | None) -> list[types.TextContent]:
    if not arguments:
        return [types.TextContent(type="text", text="Argumentos ausentes")]
    
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        return [types.TextContent(type="text", text="ERRO: GITHUB_TOKEN não configurada.")]

    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Antigravity-MCP-Bridge"
    }

    async with httpx.AsyncClient() as client:
        try:
            if name == "github_get_repo":
                owner = arguments.get("owner")
                repo = arguments.get("repo")
                resp = await client.get(f"https://api.github.com/repos/{owner}/{repo}", headers=headers)
                return [types.TextContent(type="text", text=resp.text)]

            elif name == "github_list_issues":
                owner = arguments.get("owner")
                repo = arguments.get("repo")
                state = arguments.get("state", "open")
                resp = await client.get(f"https://api.github.com/repos/{owner}/{repo}/issues?state={state}", headers=headers)
                return [types.TextContent(type="text", text=resp.text)]

            elif name == "github_create_issue":
                owner = arguments.get("owner")
                repo = arguments.get("repo")
                data = {
                    "title": arguments.get("title"),
                    "body": arguments.get("body", "")
                }
                resp = await client.post(f"https://api.github.com/repos/{owner}/{repo}/issues", headers=headers, json=data)
                return [types.TextContent(type="text", text=resp.text)]

            elif name == "github_get_file_contents":
                owner = arguments.get("owner")
                repo = arguments.get("repo")
                path = arguments.get("path")
                resp = await client.get(f"https://api.github.com/repos/{owner}/{repo}/contents/{path}", headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    content = base64.b64decode(data["content"]).decode("utf-8")
                    return [types.TextContent(type="text", text=content)]
                return [types.TextContent(type="text", text=f"Erro ({resp.status_code}): {resp.text}")]

            elif name == "github_create_or_update_file":
                owner = arguments.get("owner")
                repo = arguments.get("repo")
                path = arguments.get("path")
                data = {
                    "message": arguments.get("message"),
                    "content": base64.b64encode(arguments.get("content").encode("utf-8")).decode("utf-8")
                }
                if arguments.get("sha"):
                    data["sha"] = arguments.get("sha")
                
                resp = await client.put(f"https://api.github.com/repos/{owner}/{repo}/contents/{path}", headers=headers, json=data)
                return [types.TextContent(type="text", text=resp.text)]

        except Exception as e:
            return [types.TextContent(type="text", text=f"Erro de conexão/API: {str(e)}")]

    return [types.TextContent(type="text", text=f"Ferramenta desconhecida: {name}")]

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="github-bridge",
                server_version="0.1.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )

if __name__ == "__main__":
    asyncio.run(main())
