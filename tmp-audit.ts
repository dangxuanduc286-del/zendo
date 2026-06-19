import { db } from './src/lib/db';

async function main() {
  const row = await db.product.findFirst({
    where: { images: { some: { url: { not: '' } } } },
    select: {
      id: true,
      name: true,
      slug: true,
      images: {
        select: { url: true, isPrimary: true, sortOrder: true },
        orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        take: 1,
      },
    },
  });
  console.log(JSON.stringify(row, null, 2));
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect().catch(() => {});
  process.exit(1);
});
