# Regras de Desenvolvimento do Agente (HubCRM)

Este arquivo estabelece as regras de desenvolvimento e persistência de memória local que o agente Antigravity deve seguir automaticamente em toda nova conversa no CRM.

---

## 1. Gestão de Memória Persistente (Economia de Tokens)
- **Consulta Obrigatória**: No início de toda tarefa ou nova sessão de desenvolvimento, você deve abrir e consultar o arquivo [.agents/MEMORIES.md](file:///c:/Users/JoséFrazãodaSilvaNet/OneDrive%20-%2039985%20-%20DIGITAL%20TECH%20LTDA/Área%20de%20Trabalho/Clonecrm/hubcrm/.agents/MEMORIES.md) para resgatar o histórico de decisões técnicas, chaves de ambiente e regras de negócio.
- **Atualização na Conclusão**: Sempre que implementar uma nova funcionalidade, corrigir bugs arquiteturais ou alterar fluxos importantes do CRM, você deve atualizar o arquivo [.agents/MEMORIES.md](file:///c:/Users/JoséFrazãodaSilvaNet/OneDrive%20-%2039985%20-%20DIGITAL%20TECH%20LTDA/Área%20de%20Trabalho/Clonecrm/hubcrm/.agents/MEMORIES.md) documentando a decisão técnica e o impacto no sistema antes de encerrar o turno.

---

## 2. Boas Práticas e Economia de Contexto
- **Evitar Leitura Redundante**: Nunca leia arquivos de código grandes por completo apenas para obter referências. Use buscas cirúrgicas por símbolos (`grep_search`) e leia trechos parciais de interesse utilizando o fatiador de linhas do `view_file` para economizar tokens de entrada.
- **Divisão de Trabalho**: Prefira usar subagentes especialistas com prompts atômicos e contextos enxutos para tarefas paralelas, mantendo a conversa principal limpa e eficiente.
