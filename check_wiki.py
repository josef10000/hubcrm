import os
import json
import base64
import re
from firebase_admin import credentials, firestore, initialize_app

def check_wiki():
    try:
        sa_str = os.environ.get('FIREBASE_SERVICE_ACCOUNT', '')
        if not sa_str:
            print("Error: FIREBASE_SERVICE_ACCOUNT not found")
            return
            
        sa_json = json.loads(base64.b64decode(sa_str).decode('utf-8'))
        initialize_app(credentials.Certificate(sa_json))
        db = firestore.client()
        
        # Tentar colecao 'wiki' e 'wikiArticles' (vimos anteriormente que houve mudanca de nome)
        articles = []
        for coll_name in ['wiki', 'wikiArticles']:
            docs = db.collection(coll_name).limit(5).get()
            for d in docs:
                data = d.to_dict()
                content = data.get('content', '')
                images = re.findall(r'src=["\']([^"\']+)["\']', content)
                articles.append({
                    'collection': coll_name,
                    'title': data.get('title'),
                    'image_count': len(images),
                    'sample_urls': images[:2]
                })
        
        print(json.dumps(articles, indent=2))
        
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    check_wiki()
