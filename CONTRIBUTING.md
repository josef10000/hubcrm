# Guia de Contribuição - Hub Central

Obrigado por se interessar em contribuir com o **Hub Symples**! Este documento define as diretrizes para manter o código organizado, seguro e performático.

## 🌿 Git Flow & Branches

- **Branch Principal (`main`)**: Sempre deve refletir o estado de produção. Nunca faça commits diretos na `main` sem passar por linting e validação.
- **Desenvolvimento**: Utilize branches descritivas para novas features ou correções:
  - `feat/nome-da-feature`
  - `fix/descricao-do-bug`
  - `docs/melhorias-na-documentacao`

## 💬 Padrão de Commits

Seguimos as [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):
- `feat`: Nova funcionalidade.
- `fix`: Correção de bug.
- `docs`: Mudanças apenas na documentação.
- `style`: Mudanças que não afetam o sentido do código (espaços, formatação, etc).
- `refactor`: Mudança de código que não corrige bug nem adiciona funcionalidade.
- `perf`: Mudança de código que melhora a performance.
- `chore`: Atualização de tarefas de build, pacotes, etc.

Exemplo: `feat: add support for multiple file uploads in briefing`

## 🎨 Código e Estilização

### TypeScript & React
- Sempre defina interfaces para Props de componentes.
- Evite o uso de `any`; utilize `unknown` ou tipos parciais se necessário.
- Mantenha os componentes focados e reutilizáveis em `src/components`.

### Tailwind CSS
- Utilize as classes utilitárias nativas do Tailwind 4.0.
- Evite CSS inline se houver uma classe utilitária correspondente.
- Mantenha a consistência com o sistema de cores definido em `index.css`.

## 🧪 Testes e Validação

Antes de realizar o push, sempre execute:
```bash
# Validar erros de tipagem e linting
npm run lint

# Executar testes unitários (se disponíveis)
npm test
```

## 🔐 Segurança

- **NUNCA** adicione chaves de API reais ao código ou ao repositório.
- Sempre utilize o `.env.example` para documentar novas variáveis de ambiente necessárias.
- Verifique se logs sensíveis não estão sendo rastreados pelo Git via `.gitignore`.

---
*Transformando o complexo em simples.* - **Equipe Hub Symples**
