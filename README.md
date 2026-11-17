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

Next.js (App Router), React, TypeScript, Tailwind CSS, CSS customizado, Lucide, Recharts, Ollama (gratuito e local), OpenAI API (opcional) e GitHub REST API.

## Executar gratuitamente com Ollama (Ubuntu/Linux)

**O Guardian pode funcionar sem créditos da OpenAI**, utilizando um modelo de linguagem que roda no seu próprio computador. O desempenho depende da memória RAM e do processador.

**Pré-requisitos:** Node.js 20.9+, npm, Git e Ollama.

1. Instale o Ollama seguindo as instruções oficiais: <https://ollama.com/download/linux>. Uma opção no Ubuntu é:

   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```

2. Baixe um modelo compacto para análise de código:

   ```bash
   ollama pull qwen2.5-coder:3b
   ```

3. Confira se o Ollama está em execução com `ollama list`. Se necessário, abra outro terminal e execute `ollama serve`.

4. Instale as dependências e crie o arquivo de configuração:

   ```bash
   npm install
   cp .env.example .env.local
   ```

5. Configure o arquivo `.env.local`:

   ```dotenv
   AI_PROVIDER=ollama
   OLLAMA_MODEL=qwen2.5-coder:3b
   OPENAI_API_KEY=
   ```

6. Execute `npm run dev` e acesse <http://localhost:3000>. Informe um repositório GitHub público e sem dados sensíveis.

**Limitações:** a análise local pode ser mais lenta que a análise em nuvem, especialmente em computadores com pouca RAM. Para reduzir a carga, o Guardian envia uma amostra menor de arquivos ao modelo local. Alguns modelos pequenos podem retornar JSON inválido e necessitar de nova execução ou ajustes.

## Alternativa: OpenAI API

Se possuir créditos de API, configure:

```dotenv
AI_PROVIDER=openai
OPENAI_API_KEY=sua_chave_de_api
OPENAI_MODEL=gpt-4o-mini
```

O ChatGPT Plus não inclui créditos de API. Não envie `.env.local` ao GitHub.

## Verificações

```bash
npm run typecheck
npm run build
```

## Como o motor funciona

1. Valida a URL HTTPS do GitHub e consulta apenas repositórios **públicos**.
2. Obtém até 14 arquivos selecionados de documentação e código, com limites de tamanho.
3. Remove padrões comuns de segredos e oculta valores de `.env.example`. **Esse filtro não garante sanitização completa**.
4. Mede seis critérios básicos de presença de documentação (o sexto só é incluído se existir arquivo de ambiente de exemplo).
5. Envia trechos selecionados ao modelo escolhido (Ollama local ou OpenAI API) para análise semântica com relatório JSON.
6. Valida o formato e exige que cada achado cite um trecho existente no arquivo da amostra.
7. Mostra o relatório e armazena até 40 análises no `localStorage` do navegador.

**Atenção:** a porcentagem representa *critérios documentais satisfeitos*, não uma medição absoluta de qualidade. A IA analisa uma **amostra**, pode não encontrar lacunas existentes e pode produzir interpretações que exijam revisão humana. O sistema não edita repositórios nem abre PRs.

## Segurança e limitações

- **Não utilize repositórios privados, credenciais, dados pessoais ou código confidencial.** Com Ollama, a análise roda localmente; com OpenAI API, trechos dos arquivos são enviados a um fornecedor externo.
- Execute este MVP apenas em ambiente local ou controlado. A rota `/api/analyze` ainda não possui autenticação ou limitação por usuário. Não publique o MVP sem proteção; a opção OpenAI poderá gerar custos e o Ollama poderá consumir excessivamente recursos locais.
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
