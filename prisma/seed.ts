import { PrismaClient, Role, ServiceCategory } from "@prisma/client";

const db = new PrismaClient();
const LEGACY_PASSWORD_MARKER = "managed-by-supabase-auth";

const internal = [
  "Limpeza comercial",
  "Limpeza técnica ou detalhada",
  "Limpeza de banco de couro",
  "Limpeza de banco de tecido",
  "Descontaminação de plásticos",
  "Revitalização dos plásticos",
  "Vitrificação dos plásticos",
  "Hidratação do banco de couro",
  "Remoção e lavagem do carpete",
  "Higienização do ar-condicionado",
  "Troca do filtro do ar-condicionado",
  "Máquina de ozônio",
  "Instalação do assoalho de couro",
  "Instalação de banco de couro",
  "Instalação do couro das portas",
  "Remoção e limpeza das borrachas das portas",
  "Instalação de capa de volante de couro",
  "Limpeza técnica dos dutos de ar",
  "Vedação do assoalho",
  "Feltro de assoalho",
];

const external = [
  "Limpeza comercial",
  "Limpeza técnica",
  "Descontaminação dos emblemas",
  "Aplicação de cera líquida",
  "Aplicação de cera de carnaúba",
  "Remoção do vitrificador",
  "Descontaminação de pintura",
  "Descontaminação de chuva ácida dos vidros",
  "Remoção de chuva ácida da pintura",
  "Descontaminação dos plásticos",
  "Polimento técnico e correção de microrriscos",
  "Polimento técnico com lixamento",
  "Polimento comercial e brilho",
  "Vitrificação de pintura",
  "Vitrificação dos plásticos",
  "Vitrificação dos vidros",
  "Limpeza técnica do motor",
  "Limpeza técnica do chassi",
  "Aplicação de verniz no chassi, motor e caixa de roda",
  "Ducha",
  "Restauração de chassi ou pintura",
  "Pintura de roda",
];

const checklistGroups: Record<string, string[]> = {
  "Dados de entrada": [
    "Quilometragem",
    "Nível de combustível",
    "Data e hora de entrada",
    "Previsão de entrega",
    "Observações gerais",
  ],
  "Estado externo": [
    "Para-choque dianteiro",
    "Para-choque traseiro",
    "Capô",
    "Teto",
    "Porta dianteira esquerda",
    "Porta dianteira direita",
    "Porta traseira esquerda",
    "Porta traseira direita",
    "Lateral esquerda",
    "Lateral direita",
    "Para-lamas",
    "Vidro dianteiro",
    "Vidro traseiro",
    "Vidros laterais",
    "Retrovisores",
    "Faróis",
    "Lanternas",
    "Rodas",
    "Pneus",
    "Placa",
    "Pintura em geral",
  ],
  "Estado interno": [
    "Bancos",
    "Painel",
    "Volante",
    "Forro do teto",
    "Carpete",
    "Tapetes",
    "Portas internas",
    "Porta-malas",
    "Sistema multimídia",
    "Ar-condicionado",
  ],
  "Acessórios e objetos": [
    "Chave reserva",
    "Documentos no veículo",
    "Objetos pessoais",
    "Estepe",
    "Macaco",
    "Triângulo",
    "Ferramentas",
    "Som ou multimídia",
  ],
  "Painel e funcionamento": [
    "Luz de injeção acesa",
    "Luz de óleo acesa",
    "Luz de bateria acesa",
    "Luz de airbag acesa",
    "Outros alertas no painel",
  ],
};

function seedAdminEmail() {
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@barracar.local")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("SEED_ADMIN_EMAIL deve conter um e-mail válido.");
  }
  return email;
}

async function main() {
  const adminEmail = seedAdminEmail();
  await db.user.upsert({
    where: { username: "admin" },
    update: {
      name: "Administrador",
      email: adminEmail,
      role: Role.ADMIN,
      active: true,
    },
    create: {
      name: "Administrador",
      email: adminEmail,
      username: "admin",
      passwordHash: LEGACY_PASSWORD_MARKER,
      role: Role.ADMIN,
      active: true,
    },
  });

  await db.companySettings.upsert({
    where: { id: "default" },
    update: {},
    create: {},
  });

  for (const [category, names] of [
    [ServiceCategory.INTERNAL, internal],
    [ServiceCategory.EXTERNAL, external],
  ] as const) {
    for (const name of names) {
      await db.service.upsert({
        where: { name_category: { name, category } },
        update: { active: true },
        create: {
          name,
          category,
          defaultPrice: 0,
          durationMinutes: 60,
        },
      });
    }
  }

  const template = await db.checklistTemplate.upsert({
    where: { name: "Vistoria padrão Barracar" },
    update: { active: true },
    create: { name: "Vistoria padrão Barracar" },
  });
  let displayOrder = 0;
  for (const [category, titles] of Object.entries(checklistGroups)) {
    for (const title of titles) {
      await db.checklistTemplateItem.upsert({
        where: { templateId_title: { templateId: template.id, title } },
        update: { category, displayOrder, active: true },
        create: {
          templateId: template.id,
          title,
          category,
          displayOrder,
          active: true,
        },
      });
      displayOrder += 1;
    }
  }

  const [adminUsers, defaultServices, checklistItems] = await Promise.all([
    db.user.count({ where: { username: "admin", email: adminEmail } }),
    db.service.count({
      where: {
        OR: [
          { category: ServiceCategory.INTERNAL, name: { in: internal } },
          { category: ServiceCategory.EXTERNAL, name: { in: external } },
        ],
      },
    }),
    db.checklistTemplateItem.count({ where: { templateId: template.id } }),
  ]);
  const expectedChecklistItems = Object.values(checklistGroups).flat().length;
  if (
    adminUsers !== 1 ||
    defaultServices !== internal.length + external.length ||
    checklistItems !== expectedChecklistItems
  ) {
    throw new Error("A verificação de idempotência do seed encontrou contagens inesperadas.");
  }

  console.log(
    `Seed concluído e verificado: 1 administrador, ${defaultServices} serviços e ${checklistItems} itens de checklist.`,
  );
}

main()
  .catch((error) => {
    console.error("Falha ao executar o seed.", error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
