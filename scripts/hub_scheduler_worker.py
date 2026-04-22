import httpx
import asyncio
import os
import json
from datetime import datetime

# Configurações via Variáveis de Ambiente
PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID")
API_KEY = os.environ.get("FIREBASE_API_KEY")

async def run_scheduler():
    if not PROJECT_ID or not API_KEY:
        print("ERRO: FIREBASE_PROJECT_ID e FIREBASE_API_KEY são obrigatórios.")
        return

    url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents:runQuery"
    params = {"key": API_KEY}
    
    # Query: Buscar todas as mensagens com status 'scheduled' que já deveriam ter sido enviadas
    now_iso = datetime.utcnow().isoformat() + "Z"
    
    query = {
        "structuredQuery": {
            "from": [{"collectionId": "messages", "allDescendants": True}],
            "where": {
                "compositeFilter": {
                    "op": "AND",
                    "filters": [
                        {
                            "fieldFilter": {
                                "field": {"fieldPath": "status"},
                                "op": "EQUAL",
                                "value": {"stringValue": "scheduled"}
                            }
                        },
                        {
                            "fieldFilter": {
                                "field": {"fieldPath": "scheduledAt"},
                                "op": "LESS_THAN_OR_EQUAL",
                                "value": {"timestampValue": now_iso}
                            }
                        },
                        {
                            "fieldFilter": {
                                "field": {"fieldPath": "isDeleted"},
                                "op": "NOT_EQUAL",
                                "value": {"booleanValue": True}
                            }
                        }
                    ]
                }
            }
        }
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        print(f"[{datetime.now()}] Iniciando varredura de mensagens agendadas...")
        try:
            resp = await client.post(url, params=params, json=query)
            if resp.status_code != 200:
                # Se der erro de índice, o Firestore retorna o link no corpo do erro
                print(f"Erro na query (pode ser falta de índice): {resp.text}")
                return

            results = resp.json()
            # O Firestore retorna uma lista de objetos, cada um com uma chave 'document' (se houver match)
            # Se não houver mensagens, ele retorna um objeto vazio ou lista vazia
            found_count = 0
            for item in results:
                if "document" not in item: continue
                found_count += 1
                doc = item["document"]
                doc_path = doc["name"] # projects/xxx/databases/(default)/documents/organizations/xxx/chats/xxx/messages/xxx
                fields = doc.get("fields", {})
                
                text = fields.get("text", {}).get("stringValue", "Mensagem Agendada")
                sender_name = fields.get("senderName", {}).get("stringValue", "Sistema")
                sender_id = fields.get("senderId", {}).get("stringValue", "")
                
                print(f"-> Processando mensagem: {text[:30]}... (ID: {doc_path.split('/')[-1]})")
                
                # 1. Atualizar o Status da Mensagem para 'sent' e a data de criação para agora
                patch_url = f"https://firestore.googleapis.com/v1/{doc_path}"
                patch_params = {"key": API_KEY, "updateMask.fieldPaths": ["status", "createdAt"]}
                patch_data = {
                    "fields": {
                        "status": {"stringValue": "sent"},
                        "createdAt": {"timestampValue": now_iso}
                    }
                }
                
                p_resp = await client.patch(patch_url, params=patch_params, json=patch_data)
                if p_resp.status_code == 200:
                    print(f"   [OK] Mensagem marcada como enviada.")
                    
                    # 2. Atualizar o Chat Pai (Denormalização)
                    # Caminho do chat: extrair de projects/.../organizations/{org}/chats/{chat}/messages/{msg}
                    parts = doc_path.split('/')
                    # parts: ['projects', 'id', 'databases', '(default)', 'documents', 'organizations', 'ORG_ID', 'chats', 'CHAT_ID', 'messages', 'MSG_ID']
                    if len(parts) >= 9:
                        chat_path = "/".join(parts[:-2]) # Remove 'messages' e 'MSG_ID'
                        chat_url = f"https://firestore.googleapis.com/v1/{chat_path}"
                        chat_patch_params = {"key": API_KEY, "updateMask.fieldPaths": ["lastMessage", "updatedAt"]}
                        chat_patch_data = {
                            "fields": {
                                "lastMessage": {
                                    "mapValue": {
                                        "fields": {
                                            "text": {"stringValue": text[:100]},
                                            "senderId": {"stringValue": sender_id},
                                            "senderName": {"stringValue": sender_name},
                                            "createdAt": {"timestampValue": now_iso}
                                        }
                                    }
                                },
                                "updatedAt": {"timestampValue": now_iso}
                            }
                        }
                        await client.patch(chat_url, params=chat_patch_params, json=chat_patch_data)
                else:
                    print(f"   [ERRO] Falha ao atualizar mensagem: {p_resp.text}")

            if found_count == 0:
                print("Nenhuma mensagem agendada para este momento.")
            else:
                print(f"Varredura finalizada. {found_count} mensagens processadas.")

        except Exception as e:
            print(f"Erro inesperado: {str(e)}")

if __name__ == "__main__":
    asyncio.run(run_scheduler())
