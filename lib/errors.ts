/**
 * Erro de negócio cuja mensagem é segura para exibir ao usuário final.
 * Qualquer outro Error é tratado como interno e substituído por uma
 * mensagem genérica em `actionFailure`.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}
