import asyncio
import os
import httpx
from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions, Server
from mcp.server.stdio import stdio_server
import mcp.types as types

# Servidor MCP para Bridge do OpenRouter
server = Server("openrouter-bridge")

@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="openrouter_chat",
            description="Envia um prompt para qualquer modelo do OpenRouter e retorna a resposta.",
            inputSchema={
                "type": "object",
                "properties": {
                    "model": {"type": "string", "description": "ID do modelo (ex: 'anthropic/claude-3.5-sonnet', 'google/gemini-2.0-flash-001')"},
                    "prompt": {"type": "string", "description": "A mensagem para o modelo"},
                    "max_tokens": {"type": "integer", "default": 2048}
                },
                "required": ["model", "prompt"]
            }
        ),
        types.Tool(
            name="openrouter_list_models",
            description="Lista os modelos disponíveis no OpenRouter.",
            inputSchema={"type": "object", "properties": {}}
        )
    ]

@server.call_tool()
async def handle_call_tool(name: str, arguments: dict | None) -> list[types.TextContent]:
    if not arguments:
        return [types.TextContent(type="text", text="Argumentos ausentes")]
    
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        return [types.TextContent(type="text", text="ERRO: OPENROUTER_API_KEY não configurada no ambiente do MCP.")]

    if name == "openrouter_chat":
        model = arguments.get("model")
        prompt = arguments.get("prompt")
        max_tokens = arguments.get("max_tokens", 2048)

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "X-Title": "Antigravity Bridge",
                    },
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": max_tokens
                    },
                    timeout=60.0
                )
                
                if response.status_code != 200:
                    return [types.TextContent(type="text", text=f"Erro na API ({response.status_code}): {response.text}")]
                
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                return [types.TextContent(type="text", text=content)]
            except Exception as e:
                return [types.TextContent(type="text", text=f"Erro de conexão: {str(e)}")]

    elif name == "openrouter_list_models":
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get("https://openrouter.ai/api/v1/models")
                if response.status_code != 200:
                    return [types.TextContent(type="text", text=f"Erro ao listar modelos: {response.text}")]
                
                data = response.json()
                models = [m["id"] for m in data["data"]]
                return [types.TextContent(type="text", text="\n".join(models[:50]) + "\n... (e muitos outros)")]
            except Exception as e:
                return [types.TextContent(type="text", text=f"Erro ao buscar modelos: {str(e)}")]

    return [types.TextContent(type="text", text=f"Ferramenta desconhecida: {name}")]

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="openrouter-bridge",
                server_version="0.1.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )

if __name__ == "__main__":
    asyncio.run(main())
