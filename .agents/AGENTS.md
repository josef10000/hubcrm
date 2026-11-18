# Regras de Desenvolvimento do Agente (HubCRM)

Este arquivo estabelece as regras de desenvolvimento e persistência de memória local que o agente Antigravity deve seguir automaticamente em toda nova conversa no CRM.

---

## 1. Gestão de Memória Persistente (Economia de Tokens)
- **Consulta Obrigatória**: No início de toda tarefa ou nova sessão de desenvolvimento, você deve abrir e consultar o arquivo `.agents/MEMORIES.md` para resgatar o histórico de decisões técnicas, chaves de ambiente e regras de negócio.
- **Atualização na Conclusão**: Sempre que implementar uma nova funcionalidade, corrigir bugs arquiteturais ou alterar fluxos importantes do CRM, você deve atualizar o arquivo `.agents/MEMORIES.md` documentando a decisão técnica e o impacto no sistema antes de encerrar o turno.

---

## 2. Boas Práticas e Economia de Contexto
- **Evitar Leitura Redundante**: Nunca leia arquivos de código grandes por completo apenas para obter referências. Use buscas cirúrgicas por símbolos e leia trechos parciais de interesse para economizar tokens de entrada.
- **Divisão de Trabalho**: Prefira usar subagentes especialistas com prompts atômicos e contextos enxutos para tarefas paralelas, mantendo a conversa principal limpa e eficiente.

---

## 3. Deploy e Push Automático para o GitHub
- **Push Automático sem Perguntar**: Sempre que finalizar qualquer implementação, ajuste visual ou correção de código, valide o build e execute `git add`, `git commit` e `git push origin main` automaticamente, **sem precisar pedir permissão antes**.
