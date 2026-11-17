# CITi Brain Guardian 🛡️

> O conhecimento não pode sair quando um membro sai.

Protótipo independente do desafio de inovação do CITi (CIn-UFPE). O Guardian utiliza **IA de verdade** para comparar uma amostra de arquivos de código-fonte e documentação de um repositório público do GitHub, apontando possíveis lacunas com evidências e sugestões.

## Funcionalidades disponíveis no MVP

- **Guardian:** recebe URL de repositório público, consulta código/documentação no GitHub e envia contexto selecionado à API de IA para detectar possíveis lacunas.
- **Análises:** histórico e gráfico de evolução de critérios documentais, sempre com dados produzidos por execuções reais.
- **Projetos:** cadastro local de repositórios e acesso rápido a novas análises.
- **Configurações:** escolha do rigor das análises e avisos sobre limites de privacidade.
- **Verificação de evidência:** resultados cuja referência não coincide com um dos arquivos lidos são descartados.
- **Sem resultados fictícios:** a interface começa vazia até realizar uma análise real.

## Tecnologias

Next.js (App Router), React, TypeScript, Tailwind CSS, CSS customizado, Lucide, Recharts, OpenAI API e GitHub REST API.

## Como executar

**Pré-requisitos:** Node.js 20.9+ e uma chave de API da OpenAI com acesso a um modelo que suporte JSON mode.

```bash
npm install
cp .env.example .env.local
```

Edite `.env.local` (não envie para o GitHub):

```dotenv
OPENAI_API_KEY=sua_chave_aqui
OPENAI_MODEL=gpt-4o-mini
# GITHUB_TOKEN=opcional
```

Inicie:

```bash
npm run dev
```

Abra <http://localhost:3000>. Use um repositório público com README e código TypeScript/JavaScript.

Para validar os tipos e gerar build de produção:

```bash
npm run typecheck
npm run build
```

## Como o motor funciona

1. Valida a URL HTTPS do GitHub e consulta apenas repositórios **públicos**.
2. Obtém até 14 arquivos selecionados de documentação e código, com limites de tamanho.
3. Remove padrões comuns de segredos e oculta valores de `.env.example`. **Esse filtro não garante sanitização completa**.
4. Mede seis critérios básicos de presença de documentação (o sexto só é incluído se existir arquivo de ambiente de exemplo).
5. Envia trechos selecionados à OpenAI para uma análise semântica com relatório JSON.
6. Valida o formato e exige que cada achado cite um trecho existente no arquivo da amostra.
7. Mostra o relatório e armazena até 40 análises no `localStorage` do navegador.

**Atenção:** a porcentagem representa *critérios documentais satisfeitos*, não uma medição absoluta de qualidade. A IA analisa uma **amostra**, pode não encontrar lacunas existentes e pode produzir interpretações que exijam revisão humana. O sistema não edita repositórios nem abre PRs.

## Segurança e limitações

- **Não utilize repositórios privados, credenciais, dados pessoais ou código confidencial.** Trechos de arquivos públicos serão enviados a um fornecedor externo de IA, conforme as condições da API que você configurar.
- Execute este MVP apenas em ambiente local ou controlado. A rota `/api/analyze` ainda não possui autenticação, limitação por usuário ou orçamento de requisições. Publicá-la sem proteção poderia gerar custos de API.
- As credenciais ficam no servidor e nunca devem ser prefixadas com `NEXT_PUBLIC_`.
- Histórico e lista de projetos são locais ao navegador, sem sincronização entre dispositivos.
- Limites do GitHub, qualidade de amostragem e disponibilidade da API de IA podem afetar resultados.
- Monitoramento periódico, alertas em pull requests, persistência em banco de dados e autenticação são evoluções futuras.

## Roadmap

- [x] UI do dashboard com 4 abas
- [x] Leitura de GitHub e análise real por LLM
- [x] Checklists, evidências e gráfico de histórico
- [ ] Casos de teste automatizados e avaliação da precisão dos achados
- [ ] Login GitHub e permissão por repositório
- [ ] Persistência em banco de dados
- [ ] Agendamento de auditorias e GitHub Actions para pull requests

## Aviso

Projeto independente desenvolvido como proposta de inovação. Não representa um produto oficial do CITi.
