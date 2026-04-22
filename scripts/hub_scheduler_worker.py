import os
import json
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timezone

# O script agora usa FIREBASE_SERVICE_ACCOUNT para autenticação segura
def run_scheduler():
    service_account_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
    project_id = os.environ.get("FIREBASE_PROJECT_ID")

    if not service_account_json:
        print("ERRO: FIREBASE_SERVICE_ACCOUNT não configurada nas Secrets.")
        return

    try:
        # Inicializar Firebase Admin
        cert_info = json.loads(service_account_json)
        cred = credentials.Certificate(cert_info)
        firebase_admin.initialize_app(cred, {
            'projectId': project_id,
        })
        
        db = firestore.client()
        now = datetime.now(timezone.utc)
        
        print(f"[{datetime.now()}] Iniciando varredura via Service Account...")

        # Query de Grupo de Coleções (Collection Group)
        # Importante: Requer índice de grupo de coleção no Firestore para 'messages'
        # Campos: status (Ascending), scheduledAt (Ascending), isDeleted (Ascending)
        messages_query = db.collection_group('messages') \
            .where('status', '==', 'scheduled') \
            .where('scheduledAt', '<=', now) \
            .stream()

        found_count = 0
        for msg_doc in messages_query:
            found_count += 1
            msg_data = msg_doc.to_dict()
            msg_id = msg_doc.id
            
            # Verificar se não foi deletada (segurança extra)
            if msg_data.get('isDeleted'):
                print(f"-> Pulando mensagem deletada: {msg_id}")
                continue

            print(f"-> Disparando mensagem: {msg_data.get('text', '')[:30]}... (ID: {msg_id})")

            # 1. Efetivar a mensagem (Status 'sent' e Data 'now')
            msg_doc.reference.update({
                'status': 'sent',
                'createdAt': firestore.SERVER_TIMESTAMP
            })

            # 2. Atualizar o Chat Pai (Denormalização para a Sidebar)
            # O caminho do documento é: organizations/{orgId}/chats/{chatId}/messages/{msgId}
            # Precisamos subir dois níveis para chegar no Chat
            chat_ref = msg_doc.reference.parent.parent
            
            chat_ref.update({
                'lastMessage': {
                    'text': msg_data.get('text', '')[:100],
                    'senderId': msg_data.get('senderId'),
                    'senderName': msg_data.get('senderName'),
                    'createdAt': firestore.SERVER_TIMESTAMP
                },
                'updatedAt': firestore.SERVER_TIMESTAMP
            })
            
            print(f"   [OK] Mensagem enviada e chat atualizado.")

        if found_count == 0:
            print("Nenhuma mensagem agendada para este momento.")
        else:
            print(f"Sucesso! {found_count} mensagens processadas.")

    except Exception as e:
        print(f"Erro crítico no processamento: {str(e)}")

if __name__ == "__main__":
    run_scheduler()
