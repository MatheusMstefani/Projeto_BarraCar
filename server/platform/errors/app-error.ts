export type ErrorFields = Record<string, string>;

export type AppErrorInput = {
  code: string;
  title: string;
  status: number;
  detail: string;
  fields?: ErrorFields;
};

/** A safe application error. Its properties may cross a server boundary. */
export class AppError extends Error {
  readonly code: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string;
  readonly fields?: ErrorFields;

  constructor(input: AppErrorInput) {
    super(input.detail);
    this.name = "AppError";
    this.code = input.code;
    this.title = input.title;
    this.status = input.status;
    this.detail = input.detail;
    this.fields = input.fields;
  }
}
export class DomainError extends AppError {
  constructor(
    detail: string,
    code = "DOMAIN_RULE_VIOLATION",
    fields?: ErrorFields,
  ) {
    super({
      code,
      title: "Não foi possível concluir a operação",
      status: 422,
      detail,
      fields,
    });
    this.name = "DomainError";
  }
}

export class AuthenticationError extends AppError {
  constructor() {
    super({
      code: "AUTHENTICATION_REQUIRED",
      title: "Autenticação necessária",
      status: 401,
      detail: "Entre novamente para continuar.",
    });
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppError {
  constructor() {
    super({
      code: "ACTION_FORBIDDEN",
      title: "Acesso não autorizado",
      status: 403,
      detail: "Você não possui permissão para realizar esta operação.",
    });
    this.name = "AuthorizationError";
  }
}
