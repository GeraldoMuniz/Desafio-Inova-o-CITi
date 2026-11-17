export interface GithubProject {
  full_name: string;
  default_branch: string;
  private: boolean;
}

type TreeEntry = { path: string; type: string; size?: number };

const apiRoot = "https://api.github.com";

function headers(): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "citi-guardian-mvp",
    ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {})
  };
}

async function githubGet<T>(path: string): Promise<T> {
  const response = await fetch(`${apiRoot}${path}`, { headers: headers(), cache: "no-store", signal: AbortSignal.timeout(12000) });
  if (!response.ok) {
    if (response.status === 404) throw new Error("Repositório ou arquivo não encontrado no GitHub.");
    if (response.status === 403) throw new Error("GitHub recusou a consulta. Pode ser um limite de acesso à API.");
    throw new Error(`Falha de comunicação com o GitHub (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

export function parseGithubUrl(raw: string): { owner: string; repo: string } {
  let url: URL;
  try { url = new URL(raw.trim()); } catch { throw new Error("Informe uma URL completa do GitHub."); }
  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com" || url.port || url.username || url.password) {
    throw new Error("Use uma URL HTTPS de repositório em github.com.");
  }
  const segments = url.pathname.replace(/\/$/, "").split("/").filter(Boolean);
  if (segments.length !== 2) throw new Error("Use o endereço principal: github.com/usuario/repositorio.");
  const [owner, name] = segments;
  const repo = name.replace(/\.git$/, "");
  if (!/^[a-z\d](?:[a-z\d-]{0,37})$/i.test(owner) || !/^[a-z\d_.-]{1,100}$/i.test(repo) || repo === "." || repo === "..") {
    throw new Error("O endereço do repositório não é válido.");
  }
  return { owner, repo };
}

const docs = ["README.md", "README.MD", "readme.md", "package.json", "tsconfig.json", "jsconfig.json", ".env.example", ".env.sample", "docs/README.md", "docs/architecture.md", "docs/arquitetura.md", "docs/setup.md"];
const extensions = /\.(ts|tsx|js|jsx|mjs|cjs|md|json)$/i;
const blocked = /(^|\/)(node_modules|\.git|\.next|dist|build|coverage|vendor|public|\.github|__snapshots__)(\/|$)/i;
const sensitive = /(^|\/)(\.env($|\.)|[^/]*\.(pem|key|p12|pfx)|[^/]*(secret|credential|private[-_]?key)[^/]*)(\/|$)/i;

function relevant(path: string, size = 0): boolean {
  if (blocked.test(path) || size > 90_000) return false;
  if (path === ".env.example" || path === ".env.sample") return true;
  if (sensitive.test(path)) return false;
  if (/\.(lock|map|svg|png|jpg|snap|test\.ts|spec\.ts)$/i.test(path)) return false;
  return extensions.test(path);
}

function preference(path: string): number {
  const exact = docs.findIndex(x => x.toLowerCase() === path.toLowerCase());
  if (exact !== -1) return exact;
  if (/^(src|app|pages)\//.test(path)) return 40 + path.split("/").length;
  if (/^(api|server|routes|lib)\//.test(path)) return 35;
  if (/^docs\//.test(path)) return 28;
  return 60 + path.split("/").length;
}

function maskSecrets(content: string): string {
  return content
    .replace(/\b(sk-[a-z0-9_-]{12,}|gh[pousr]_[a-z0-9]{12,}|github_pat_[a-z0-9_]{12,})\b/gi, "[SEGREDO_REMOVIDO]")
    .replace(/((?:api[_-]?key|secret|token|password|passwd)\s*[:=]\s*["'`]?)[^\s,"'`]{6,}/gi, "$1[VALOR_REMOVIDO]")
    .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, "$1[CREDENCIAIS_REMOVIDAS]@");
}

async function readText(owner: string, repo: string, path: string): Promise<string> {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  const item = await githubGet<{ content?: string; encoding?: string }>(`/repos/${owner}/${repo}/contents/${encoded}`);
  if (!item.content || item.encoding !== "base64") throw new Error(`Não foi possível ler ${path}.`);
  const decoded = Buffer.from(item.content.replace(/\s/g, ""), "base64").toString("utf-8");
  // Arquivos de exemplo só revelam os nomes das variáveis, nunca seus valores.
  if (path === ".env.example" || path === ".env.sample") {
    return decoded.split("\n").map(line => line.trim().match(/^([A-Z_][A-Z_\d]*)\s*=/i)?.[1]).filter(Boolean).map(key => `${key}=<valor omitido>`).join("\n");
  }
  return maskSecrets(decoded);
}

export async function collectRepository(raw: string): Promise<{ project: GithubProject; files: Array<{ path: string; content: string }> }> {
  const { owner, repo } = parseGithubUrl(raw);
  const project = await githubGet<GithubProject>(`/repos/${owner}/${repo}`);
  if (project.private) throw new Error("Neste MVP, utilize somente repositórios públicos e sem informações sensíveis.");
  const tree = await githubGet<{ tree: TreeEntry[]; truncated?: boolean }>(`/repos/${owner}/${repo}/git/trees/${encodeURIComponent(project.default_branch)}?recursive=1`);
  if (tree.truncated) throw new Error("O repositório é muito grande para uma análise completa neste MVP.");
  const candidates = (tree.tree || []).filter(file => file.type === "blob" && relevant(file.path, file.size || 0))
    .sort((a, b) => preference(a.path) - preference(b.path) || a.path.localeCompare(b.path));
  if (candidates.length === 0) throw new Error("Não encontramos arquivos de documentação ou código compatíveis.");
  // Amostragem limitada para reduzir custo e exposição de dados à API de IA.
  const selected = candidates.slice(0, 14);
  const files: Array<{ path: string; content: string }> = [];
  let remaining = 38_000;
  for (const item of selected) {
    if (remaining < 400) break;
    try {
      const rawText = await readText(owner, repo, item.path);
      const content = rawText.slice(0, Math.min(remaining, 6500));
      if (content.trim()) {
        files.push({ path: item.path, content });
        remaining -= content.length;
      }
    } catch { /* Um arquivo isolado indisponível não interrompe a análise. */ }
  }
  if (files.length === 0) throw new Error("Não foi possível ler os arquivos selecionados.");
  return { project, files };
}

export function checkCriteria(files: Array<{ path: string; content: string }>) {
  const readme = files.find(file => /^readme\.md$/i.test(file.path))?.content || "";
  const env = files.some(file => /^\.env\.(example|sample)$/.test(file.path));
  const lower = readme.toLowerCase();
  const criteria = [
    { name: "README na raiz", met: Boolean(readme), reason: "Existência de README.md no diretório principal" },
    { name: "Instruções de instalação", met: /(instala|install|setup|npm i\b|npm install|pnpm install|yarn install)/i.test(lower), reason: "Como instalar dependências e preparar o projeto" },
    { name: "Instruções de execução", met: /(execut|iniciar|rodar|running|npm run|pnpm dev|yarn dev|start)/i.test(lower), reason: "Como iniciar o projeto localmente" },
    { name: "Arquitetura ou tecnologias", met: /(arquitet|architecture|estrutura|stack|tecnolog|framework)/i.test(lower), reason: "Visão da estrutura ou principais tecnologias utilizadas" },
    { name: "Testes documentados", met: /(testes?\b|testing|npm test|jest|vitest|playwright)/i.test(lower), reason: "Como verificar a qualidade por testes" },
    ...(env ? [{ name: "Configuração de ambiente", met: /(\.env|vari[aá]veis? de ambiente|environment variables?)/i.test(readme), reason: "Configuração das variáveis listadas no .env.example ou .env.sample" }] : [])
  ];
  const coverage = Math.round((criteria.filter(x => x.met).length / criteria.length) * 100);
  return { criteria, coverage };
}
