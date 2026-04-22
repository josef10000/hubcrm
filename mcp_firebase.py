import asyncio
import os
import httpx
from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions, Server
from mcp.server.stdio import stdio_server
import mcp.types as types

# Servidor MCP para Bridge do Firebase (Firestore)
server = Server("firebase-bridge")

DEFAULT_PROJECT_ID = "gassistant-83242"

@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="firebase_get_document",
            description="Obtém um documento do Firestore.",
            inputSchema={
                "type": "object",
                "properties": {
                    "collection": {"type": "string", "description": "Nome da coleção"},
                    "document_id": {"type": "string", "description": "ID do documento"},
                    "project_id": {"type": "string", "description": "ID do projeto (opcional)"}
                },
                "required": ["collection", "document_id"]
            }
        ),
        types.Tool(
            name="firebase_list_collection",
            description="Lista documentos de uma coleção no Firestore.",
            inputSchema={
                "type": "object",
                "properties": {
                    "collection": {"type": "string"},
                    "project_id": {"type": "string", "description": "ID do projeto (opcional)"},
                    "page_size": {"type": "integer", "default": 20}
                },
                "required": ["collection"]
            }
        ),
        types.Tool(
            name="firebase_set_document",
            description="Cria ou atualiza um documento no Firestore.",
            inputSchema={
                "type": "object",
                "properties": {
                    "collection": {"type": "string"},
                    "document_id": {"type": "string"},
                    "data": {"type": "object", "description": "Dados do documento (formato JSON)"},
                    "project_id": {"type": "string", "description": "ID do projeto (opcional)"}
                },
                "required": ["collection", "document_id", "data"]
            }
        )
    ]

@server.call_tool()
async def handle_call_tool(name: str, arguments: dict | None) -> list[types.TextContent]:
    if not arguments:
        return [types.TextContent(type="text", text="Argumentos ausentes")]
    
    project_id = arguments.get("project_id") or os.environ.get("FIREBASE_PROJECT_ID") or DEFAULT_PROJECT_ID
    api_key = os.environ.get("FIREBASE_API_KEY")
    token = os.environ.get("FIREBASE_TOKEN") # Token de autenticação (OAuth2 ou ID Token)

    base_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents"
    
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    params = {}
    if api_key:
        params["key"] = api_key

    async with httpx.AsyncClient() as client:
        try:
            if name == "firebase_get_document":
                col = arguments.get("collection")
                doc = arguments.get("document_id")
                resp = await client.get(f"{base_url}/{col}/{doc}", headers=headers, params=params)
                return [types.TextContent(type="text", text=resp.text)]

            elif name == "firebase_list_collection":
                col = arguments.get("collection")
                page_size = arguments.get("page_size", 20)
                params["pageSize"] = page_size
                resp = await client.get(f"{base_url}/{col}", headers=headers, params=params)
                return [types.TextContent(type="text", text=resp.text)]

            elif name == "firebase_set_document":
                col = arguments.get("collection")
                doc = arguments.get("document_id")
                data = arguments.get("data")
                # O Firestore REST API espera campos no formato {"fields": {"name": {"stringValue": "..."}}}
                # Para simplificar, este bridge assume que o usuário passa o formato correto ou enviamos o JSON cru (o que pode falhar se não formatado)
                # Mas para ser um bridge "útil", vamos apenas repassar o que foi pedido.
                resp = await client.patch(f"{base_url}/{col}/{doc}", headers=headers, params=params, json={"fields": data} if "fields" not in data else data)
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
                server_name="firebase-bridge",
                server_version="0.1.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )

if __name__ == "__main__":
    asyncio.run(main())
